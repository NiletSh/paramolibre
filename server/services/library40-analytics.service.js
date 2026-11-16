const db = require('../config/db');
const { seedOverview, OVERDUE_DAYS } = require('../data/library40-seed');

const SHELF_SLOTS = [
  'Modulo-A-Nivel-1',
  'Modulo-A-Nivel-2',
  'Modulo-A-Nivel-3',
  'Modulo-B-Nivel-1',
  'Modulo-B-Nivel-2',
  'Modulo-B-Nivel-3',
  'Modulo-C-Nivel-1',
  'Modulo-C-Nivel-2',
  'Modulo-C-Nivel-3'
];

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function emptySlot(code) {
  const match = /^Modulo-(.+)-Nivel-(\d+)$/.exec(code);
  return {
    slot: code,
    module: match ? match[1] : 'A',
    level: match ? Number(match[2]) : 1,
    presence: 'empty',
    alert: null,
    days_out: 0,
    book: null
  };
}

function mapTwin(rows) {
  const bySlot = new Map(SHELF_SLOTS.map((code) => [code, emptySlot(code)]));
  const unslotted = [];

  for (const row of rows) {
    const away = row.comprehension_status === 'EN_CURSO';
    const days = away ? Number(row.days_out || 0) : 0;
    const cell = {
      presence: away ? 'away' : 'present',
      alert: away && days >= OVERDUE_DAYS ? 'overdue' : null,
      days_out: days,
      book: {
        id: Number(row.id),
        title: row.titulo,
        author: row.autor,
        category: row.category || 'Sin categoría',
        physical_condition: row.physical_condition,
        lexical_complexity: row.lexical_complexity
      }
    };
    if (bySlot.has(row.shelf_slot_location)) {
      const current = bySlot.get(row.shelf_slot_location);
      bySlot.set(row.shelf_slot_location, { ...current, ...cell });
    } else if (row.shelf_slot_location || away) {
      unslotted.push({
        slot: row.shelf_slot_location || 'Sin slot',
        module: '—',
        level: 0,
        ...cell
      });
    }
  }

  return { twin: SHELF_SLOTS.map((code) => bySlot.get(code)), unslotted };
}

async function hasLiveData() {
  const [slots] = await db.query(
    `SELECT COUNT(*) AS total
     FROM libros
     WHERE activo = TRUE AND shelf_slot_location IS NOT NULL`
  );
  const [sessions] = await db.query('SELECT COUNT(*) AS total FROM reading_sessions');
  return Number(slots[0].total) > 0 || Number(sessions[0].total) > 0;
}

async function loadKpis() {
  const [rows] = await db.query(`
    SELECT
      SUM(CASE WHEN comprehension_status IN ('PENDIENTE_VALIDACION', 'VALIDADO') THEN 1 ELSE 0 END) AS finished_count,
      SUM(CASE
            WHEN comprehension_status = 'OMITIDO'
              OR (comprehension_status = 'EN_CURSO' AND checked_out_at < NOW() - INTERVAL 21 DAY)
            THEN 1 ELSE 0
          END) AS abandoned_count,
      SUM(CASE
            WHEN comprehension_status = 'EN_CURSO' AND checked_out_at >= NOW() - INTERVAL 21 DAY
            THEN 1 ELSE 0
          END) AS in_progress_count,
      ROUND(AVG(reading_duration_minutes)) AS avg_reading_minutes
    FROM reading_sessions
  `);
  const row = rows[0] || {};
  const finished = Number(row.finished_count || 0);
  const abandoned = Number(row.abandoned_count || 0);
  const denom = finished + abandoned;
  return {
    finished_count: finished,
    abandoned_count: abandoned,
    in_progress_count: Number(row.in_progress_count || 0),
    finished_rate: denom ? round1((finished / denom) * 100) : 0,
    abandoned_rate: denom ? round1((abandoned / denom) * 100) : 0,
    avg_reading_minutes: Number(row.avg_reading_minutes || 0)
  };
}

async function loadCategories() {
  const [rows] = await db.query(`
    SELECT
      COALESCE(c.nombre, 'Sin categoría') AS category,
      ROUND(AVG(rs.comprehension_score)) AS average_score,
      COUNT(*) AS sessions
    FROM reading_sessions rs
    JOIN libros l ON l.id = rs.book_id
    LEFT JOIN categorias c ON c.id = l.categoria_id
    WHERE rs.comprehension_status = 'VALIDADO' AND rs.comprehension_score IS NOT NULL
    GROUP BY COALESCE(c.nombre, 'Sin categoría')
    ORDER BY average_score DESC
  `);
  return rows.map((row) => ({
    category: row.category,
    average_score: Number(row.average_score || 0),
    sessions: Number(row.sessions || 0)
  }));
}

async function loadQualitative() {
  const [rows] = await db.query(`
    SELECT
      COALESCE(c.nombre, 'Sin categoría') AS category,
      rs.comprehension_score AS score,
      rs.earned_reader_points AS points,
      rs.ai_qualitative_summary AS summary,
      COALESCE(rs.returned_at, rs.checked_out_at) AS when_at
    FROM reading_sessions rs
    JOIN libros l ON l.id = rs.book_id
    LEFT JOIN categorias c ON c.id = l.categoria_id
    WHERE rs.comprehension_status = 'VALIDADO'
      AND rs.ai_qualitative_summary IS NOT NULL
      AND rs.ai_qualitative_summary <> ''
    ORDER BY when_at DESC
    LIMIT 8
  `);
  return rows.map((row) => ({
    category: row.category,
    score: Number(row.score || 0),
    points: Number(row.points || 0),
    summary: row.summary,
    when: row.when_at
  }));
}

async function loadTwin() {
  const [rows] = await db.query(`
    SELECT
      l.id,
      l.titulo,
      l.autor,
      l.shelf_slot_location,
      l.physical_condition,
      l.lexical_complexity,
      c.nombre AS category,
      rs.comprehension_status,
      GREATEST(0, DATEDIFF(NOW(), rs.checked_out_at)) AS days_out
    FROM libros l
    LEFT JOIN categorias c ON c.id = l.categoria_id
    LEFT JOIN reading_sessions rs
      ON rs.book_id = l.id AND rs.comprehension_status = 'EN_CURSO'
    WHERE l.activo = TRUE
      AND (l.shelf_slot_location IS NOT NULL OR rs.id IS NOT NULL)
  `);
  return mapTwin(rows);
}

function ticketsFromTwin(twin) {
  const tickets = [];
  for (const cell of [...twin.twin, ...twin.unslotted]) {
    if (!cell.book) continue;
    if (cell.alert === 'overdue') {
      tickets.push({
        id: `INC-${cell.book.id || tickets.length + 1}`,
        title: `${cell.book.title} lleva más de ${OVERDUE_DAYS} días fuera del estante`,
        severity: 'alta',
        state: 'abierto'
      });
    } else if (cell.book.physical_condition === 'REPARACION') {
      tickets.push({
        id: `INC-${cell.book.id || tickets.length + 1}`,
        title: `${cell.book.title} está marcado en reparación`,
        severity: 'media',
        state: 'en_curso'
      });
    }
  }
  return tickets.slice(0, 6);
}

async function loadOperations(twin, kpis) {
  const tickets = ticketsFromTwin(twin);
  let rfidTags = 0;
  let weekly = [];
  try {
    const [rfid] = await db.query('SELECT COUNT(*) AS total FROM tarjetas_rfid');
    rfidTags = Number(rfid[0]?.total || 0);
    const [rows] = await db.query(`
      SELECT YEARWEEK(COALESCE(returned_at, checked_out_at), 3) AS week_key,
             COALESCE(SUM(earned_reader_points), 0) AS points
      FROM reading_sessions
      WHERE COALESCE(returned_at, checked_out_at) >= DATE_SUB(NOW(), INTERVAL 8 WEEK)
      GROUP BY week_key
      ORDER BY week_key
    `);
    weekly = rows.map((row, index) => ({
      week: `S${index + 1}`,
      points: Number(row.points || 0)
    }));
  } catch (error) {
    weekly = [];
  }

  return {
    sla: {
      status: 'OPERATIVO',
      availability_target: 99.5,
      availability_observed: null,
      open_seconds_target: 1.5,
      open_tickets: tickets.filter((ticket) => ticket.state === 'abierto').length,
      proactive_alerts: tickets.length
    },
    tickets,
    weekly,
    rfid_tags: rfidTags,
    readers_active: Number(kpis.in_progress_count || 0)
  };
}

async function buildReaderCapital(userId) {
  const [rows] = await db.query(`
    SELECT
      COALESCE(SUM(earned_reader_points), 0) AS points,
      SUM(CASE WHEN comprehension_status IN ('VALIDADO', 'PENDIENTE_VALIDACION') THEN 1 ELSE 0 END) AS finished,
      ROUND(AVG(CASE WHEN comprehension_status = 'VALIDADO' THEN comprehension_score END)) AS comprehension
    FROM reading_sessions
    WHERE user_id = ?
  `, [userId]);
  const row = rows[0] || {};
  const points = Number(row.points || 0);
  const remainder = points % 300;
  return {
    points,
    level: Math.min(10, Math.floor(points / 300) + 1),
    finished: Number(row.finished || 0),
    comprehension: row.comprehension == null ? null : Number(row.comprehension),
    points_to_next: remainder === 0 && points > 0 ? 300 : 300 - remainder
  };
}

async function buildOverview() {
  if (!(await hasLiveData())) {
    return seedOverview();
  }
  const kpis = await loadKpis();
  const twin = await loadTwin();
  return {
    source: 'database',
    overdue_days: OVERDUE_DAYS,
    kpis: {
      ...kpis,
      comprehension_by_category: await loadCategories()
    },
    qualitative: await loadQualitative(),
    operations: await loadOperations(twin, kpis),
    twin: twin.twin,
    unslotted: twin.unslotted
  };
}

module.exports = { buildOverview, buildReaderCapital, OVERDUE_DAYS };
