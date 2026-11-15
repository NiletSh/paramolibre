const db = require('../config/db');
const Book = require('../models/book.model');
const Notification = require('./notification.service');
const { onBookPlaced, onBookRemoved } = require('./library40.service');

function normalizeUid(value) {
  const uid = String(value || '').replace(/[^0-9a-f]/gi, '').toUpperCase();
  if (uid.length < 4 || uid.length > 32) return '';
  return uid;
}

async function findBookIdByUid(uid) {
  const [rows] = await db.execute(
    'SELECT libro_id FROM tarjetas_rfid WHERE uid = ? LIMIT 1',
    [uid]
  );
  return rows[0] ? Number(rows[0].libro_id) : null;
}

async function notifyRemoval(book, readerId) {
  const title = book.title || 'Libro';
  const ownerId = Number(book.user_id || book.ownerId);
  const people = new Set();
  if (ownerId) people.add(ownerId);
  if (readerId) people.add(Number(readerId));

  for (const userId of people) {
    if (!userId) continue;
    const esDueno = userId === ownerId;
    try {
      await Notification.createNotification({
        userId,
        tipo: 'libro_retirado',
        titulo: 'Libro en préstamo',
        mensaje: esDueno
          ? `Tu libro "${title}" salió del estante.`
          : `Retiraste "${title}" del estante. Tu sesión de lectura quedó abierta.`,
        bookId: Number(book.id)
      });
    } catch (error) {
      console.warn('Aviso de retiro sin notificación:', error.message);
    }
  }
}

async function bindCard(uidRaw, bookIdRaw) {
  const uid = normalizeUid(uidRaw);
  const bookId = Number(bookIdRaw);
  if (!uid) {
    const error = new Error('UID de tarjeta inválido');
    error.status = 400;
    throw error;
  }
  const book = await Book.findById(bookId);
  if (!book) {
    const error = new Error('Libro no encontrado');
    error.status = 404;
    throw error;
  }

  const [delLibro] = await db.execute(
    'SELECT uid FROM tarjetas_rfid WHERE libro_id = ? LIMIT 1',
    [bookId]
  );
  if (delLibro.length) {
    const error = new Error('Este libro ya tiene una tarjeta vinculada y no se puede cambiar.');
    error.status = 409;
    throw error;
  }

  const [deLaTarjeta] = await db.execute(
    'SELECT libro_id FROM tarjetas_rfid WHERE uid = ? LIMIT 1',
    [uid]
  );
  if (deLaTarjeta.length) {
    const error = new Error('Esa tarjeta ya está vinculada a otro libro.');
    error.status = 409;
    throw error;
  }

  await db.execute(
    'INSERT INTO tarjetas_rfid (uid, libro_id) VALUES (?, ?)',
    [uid, bookId]
  );

  return { uid, bookId, title: book.title };
}

async function notifyUsers(userIds, payload) {
  for (const userId of userIds) {
    if (!userId) continue;
    try {
      await Notification.createNotification({ userId, ...payload });
    } catch (error) {
      console.warn('Aviso de estante sin notificación:', error.message);
    }
  }
}

async function notifyEveryone(payload) {
  const [users] = await db.execute('SELECT id FROM usuarios WHERE activo = TRUE');
  await notifyUsers(users.map((user) => user.id), payload);
}

function resolveSlot(shelfSlotLocation, slotIndex) {
  if (shelfSlotLocation) return String(shelfSlotLocation).slice(0, 80);
  if (slotIndex === undefined || slotIndex === null || slotIndex === '') return null;
  const index = Number(slotIndex);
  if (!Number.isInteger(index) || index < 0 || index > 11) return null;
  const moduleName = String.fromCharCode(65 + Math.floor(index / 3));
  const level = (index % 3) + 1;
  return `Modulo-${moduleName}-Nivel-${level}`;
}

async function safeReturn(bookId, shelfSlotLocation, slotIndex, uid) {
  const slot = resolveSlot(shelfSlotLocation, slotIndex) || 'Modulo-A-Nivel-1';
  try {
    await onBookPlaced({
      bookId,
      shelfSlotLocation: slot,
      rfidOrSensorId: uid || null
    });
  } catch (error) {
    console.warn('Gemelo digital (devolución):', error.message);
  }
  return slot;
}

async function safeCheckout(bookId, explicitUserId) {
  const readerId = Number(explicitUserId) || null;
  if (!readerId) return;
  try {
    await onBookRemoved({ bookId, userId: readerId });
  } catch (error) {
    console.warn('Sesión de lectura (retiro):', error.message);
  }
}

async function handleShelfReading({ bookId, uid, event, weight, shelfSlotLocation, slotIndex, userId }) {
  const normalizedEvent = String(event || 'removed').toLowerCase();
  const cleanUid = normalizeUid(uid);
  let resolvedBookId = Number(bookId) || null;

  if (!['removed', 'placed'].includes(normalizedEvent)) {
    const error = new Error('event debe ser "removed" o "placed"');
    error.status = 400;
    throw error;
  }

  if (!resolvedBookId && cleanUid) {
    resolvedBookId = await findBookIdByUid(cleanUid);
  }

  if (!resolvedBookId) {
    return {
      type: 'shelf',
      result: 'unknown',
      correct: false,
      uid: cleanUid,
      bookId: null,
      exchangeId: null,
      title: '',
      weight: weight ?? null,
      message: cleanUid
        ? `Tarjeta ${cleanUid} no está vinculada a un libro. Vincúlala en la ficha del libro.`
        : 'No llegó el UID ni el libro.'
    };
  }

  const book = await Book.findById(resolvedBookId);
  if (!book) {
    return {
      type: 'shelf',
      result: 'unknown',
      correct: false,
      uid: cleanUid,
      bookId: resolvedBookId,
      exchangeId: null,
      title: '',
      weight: weight ?? null,
      message: 'La tarjeta apunta a un libro que ya no existe.'
    };
  }

  const title = book.title || 'Libro';
  const readerId = Number(userId) || null;

  if (normalizedEvent === 'placed') {
    await notifyEveryone({
      tipo: 'estante_deposito',
      titulo: 'Libro devuelto',
      mensaje: `"${title}" volvió al estante.`,
      bookId: resolvedBookId
    });
    const slot = await safeReturn(resolvedBookId, shelfSlotLocation, slotIndex, cleanUid);
    return {
      type: 'shelf',
      result: 'placed',
      correct: true,
      uid: cleanUid,
      bookId: resolvedBookId,
      exchangeId: null,
      title,
      weight: weight ?? null,
      shelf_slot_location: slot,
      message: `"${title}" se devolvió al estante.`
    };
  }

  await notifyRemoval(book, readerId);
  await safeCheckout(resolvedBookId, readerId);
  return {
    type: 'shelf',
    result: 'loan',
    correct: true,
    uid: cleanUid,
    bookId: resolvedBookId,
    exchangeId: null,
    title,
    weight: weight ?? null,
    message: readerId
      ? `"${title}" salió en préstamo. La sesión de lectura quedó abierta.`
      : `"${title}" salió del estante.`
  };
}

module.exports = {
  normalizeUid,
  bindCard,
  handleShelfReading
};
