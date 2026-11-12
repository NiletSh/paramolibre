const BOOK_COLUMNS = [
  ['rfid_or_sensor_id', 'VARCHAR(64) NULL'],
  ['shelf_slot_location', 'VARCHAR(80) NULL'],
  ['physical_condition', "ENUM('OPTIMO','DESGASTE','REPARACION') NULL"],
  ['lexical_complexity', "ENUM('BASICO','INTERMEDIO','AVANZADO') NULL"]
];

async function columnExists(pool, table, column) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return Number(rows[0].total) > 0;
}

async function indexExists(pool, table, indexName) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return Number(rows[0].total) > 0;
}

async function ensureLibrary40Schema(pool) {
  for (const [name, definition] of BOOK_COLUMNS) {
    if (await columnExists(pool, 'libros', name)) continue;
    try {
      await pool.query(`ALTER TABLE libros ADD COLUMN ${name} ${definition}`);
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') throw error;
    }
  }

  if (!(await indexExists(pool, 'libros', 'idx_libros_slot'))) {
    try {
      await pool.query('CREATE INDEX idx_libros_slot ON libros (shelf_slot_location)');
    } catch (error) {
      if (error.code !== 'ER_DUP_KEYNAME') throw error;
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reading_sessions (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      book_id INT UNSIGNED NOT NULL,
      checked_out_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      returned_at TIMESTAMP NULL DEFAULT NULL,
      reading_duration_minutes INT UNSIGNED NULL,
      comprehension_status ENUM('EN_CURSO', 'PENDIENTE_VALIDACION', 'VALIDADO', 'OMITIDO') NOT NULL DEFAULT 'EN_CURSO',
      comprehension_score TINYINT UNSIGNED NULL,
      ai_qualitative_summary TEXT NULL,
      earned_reader_points INT UNSIGNED NOT NULL DEFAULT 0,
      CONSTRAINT fk_reading_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_reading_book FOREIGN KEY (book_id) REFERENCES libros(id) ON DELETE CASCADE ON UPDATE CASCADE,
      INDEX idx_reading_user_status (user_id, comprehension_status),
      INDEX idx_reading_book_status (book_id, comprehension_status),
      INDEX idx_reading_checked_out (checked_out_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

module.exports = { ensureLibrary40Schema };
