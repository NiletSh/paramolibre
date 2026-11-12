const Book = require('../models/book.model');
const ReadingSession = require('../models/reading-session.model');

const PHYSICAL = new Set(['OPTIMO', 'DESGASTE', 'REPARACION']);

/**
 * Devolución física: actualiza el slot del gemelo digital y cierra
 * la sesión de lectura activa. No lanza si no había sesión abierta,
 * para no interferir con un depósito de trueque.
 */
async function onBookPlaced({ bookId, shelfSlotLocation, rfidOrSensorId }) {
  const fields = {
    shelf_slot_location: String(shelfSlotLocation || 'Modulo-A-Nivel-1').slice(0, 80)
  };
  if (rfidOrSensorId) {
    fields.rfid_or_sensor_id = String(rfidOrSensorId).slice(0, 64);
  }
  await Book.updateDigitalTwin(bookId, fields);
  const session = await ReadingSession.closeActiveByBook(bookId);
  return { shelf_slot_location: fields.shelf_slot_location, session };
}

/** Retiro / préstamo: abre una ReadingSession EN_CURSO si el libro no tiene otra. */
async function onBookRemoved({ bookId, userId }) {
  if (!bookId || !userId) return null;
  return ReadingSession.openIfNeeded({
    userId: Number(userId),
    bookId: Number(bookId)
  });
}

function assertPhysical(value) {
  if (value == null || PHYSICAL.has(value)) return value || null;
  const error = new Error('physical_condition debe ser OPTIMO, DESGASTE o REPARACION');
  error.status = 400;
  throw error;
}

module.exports = {
  onBookPlaced,
  onBookRemoved,
  assertPhysical
};
