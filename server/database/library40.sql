-- ============================================================
-- Biblioteca Inteligente 4.0
-- Extensión compatible hacia atrás de paramo_libre.
-- El API también aplica este esquema al arrancar
-- (server/services/library40-schema.js), de forma idempotente.
-- Ejecuta este archivo una sola vez si prefieres migrar a mano.
-- ============================================================

ALTER TABLE libros
  ADD COLUMN rfid_or_sensor_id VARCHAR(64) NULL AFTER ubicacion,
  ADD COLUMN shelf_slot_location VARCHAR(80) NULL AFTER rfid_or_sensor_id,
  ADD COLUMN physical_condition ENUM('OPTIMO', 'DESGASTE', 'REPARACION') NULL AFTER shelf_slot_location,
  ADD COLUMN lexical_complexity ENUM('BASICO', 'INTERMEDIO', 'AVANZADO') NULL AFTER physical_condition;

CREATE INDEX idx_libros_slot ON libros (shelf_slot_location);

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Los datos de demostración del tablero no se insertan aquí:
-- viven en server/data/library40-seed.js y se sirven cuando
-- todavía no hay slots ni sesiones reales, para no mezclar
-- lectores ficticios con la base de usuarios existente.
