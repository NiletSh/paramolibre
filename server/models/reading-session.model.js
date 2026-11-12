const db = require('../config/db');

function normalize(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    book_id: Number(row.book_id),
    checked_out_at: row.checked_out_at,
    returned_at: row.returned_at,
    reading_duration_minutes: row.reading_duration_minutes == null ? null : Number(row.reading_duration_minutes),
    comprehension_status: row.comprehension_status,
    comprehension_score: row.comprehension_score == null ? null : Number(row.comprehension_score),
    ai_qualitative_summary: row.ai_qualitative_summary || null,
    earned_reader_points: Number(row.earned_reader_points || 0),
    title: row.title || null,
    author: row.author || null
  };
}

class ReadingSession {
  static normalize(row) {
    return normalize(row);
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT rs.*, l.titulo AS title, l.autor AS author
       FROM reading_sessions rs
       JOIN libros l ON l.id = rs.book_id
       WHERE rs.id = ?
       LIMIT 1`,
      [id]
    );
    return normalize(rows[0]);
  }

  static async findPendingByUser(userId) {
    const [rows] = await db.execute(
      `SELECT rs.*, l.titulo AS title, l.autor AS author
       FROM reading_sessions rs
       JOIN libros l ON l.id = rs.book_id
       WHERE rs.user_id = ? AND rs.comprehension_status = 'PENDIENTE_VALIDACION'
       ORDER BY rs.returned_at DESC, rs.id DESC`,
      [userId]
    );
    return rows.map(normalize);
  }

  static async findActiveByBook(bookId) {
    const [rows] = await db.execute(
      `SELECT rs.*, l.titulo AS title, l.autor AS author
       FROM reading_sessions rs
       JOIN libros l ON l.id = rs.book_id
       WHERE rs.book_id = ? AND rs.comprehension_status = 'EN_CURSO'
       ORDER BY rs.checked_out_at DESC
       LIMIT 1`,
      [bookId]
    );
    return normalize(rows[0]);
  }

  static async openIfNeeded({ userId, bookId }) {
    const existing = await ReadingSession.findActiveByBook(bookId);
    if (existing) return existing;

    const [result] = await db.execute(
      `INSERT INTO reading_sessions (user_id, book_id, comprehension_status)
       VALUES (?, ?, 'EN_CURSO')`,
      [userId, bookId]
    );
    return ReadingSession.findById(result.insertId);
  }

  static async closeActiveByBook(bookId) {
    const active = await ReadingSession.findActiveByBook(bookId);
    if (!active) return null;

    await db.execute(
      `UPDATE reading_sessions
       SET returned_at = NOW(),
           reading_duration_minutes = GREATEST(1, TIMESTAMPDIFF(MINUTE, checked_out_at, NOW())),
           comprehension_status = 'PENDIENTE_VALIDACION'
       WHERE id = ? AND comprehension_status = 'EN_CURSO'`,
      [active.id]
    );
    return ReadingSession.findById(active.id);
  }

  static async markValidated(id, { score, summary, points }) {
    await db.execute(
      `UPDATE reading_sessions
       SET comprehension_status = 'VALIDADO',
           comprehension_score = ?,
           ai_qualitative_summary = ?,
           earned_reader_points = ?
       WHERE id = ?`,
      [score, summary, points, id]
    );
    return ReadingSession.findById(id);
  }
}

module.exports = ReadingSession;
