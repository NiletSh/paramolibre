const ReadingSession = require('../models/reading-session.model');
const { complete } = require('./llm.service');

const SOCRATIC_PROMPT = `Eres el compañero de lectura de la Biblioteca Inteligente Páramo Libre.
Conversas en español, con cercanía y curiosidad. No eres un examinador escolar:
nada de opciones múltiples, rúbricas visibles, "pregunta 1" ni tono de prueba.

Reglas de la conversación:
- Haz como máximo 3 preguntas, una por turno, breves y reflexivas, sobre conceptos clave o la trama.
- Cada pregunta cabe en una o dos frases.
- Si el lector ha respondido menos de 3 veces, responde únicamente con la siguiente pregunta. Sin JSON, sin listas, sin preámbulo.
- Si el lector ya respondió 3 veces, no hagas otra pregunta. Responde únicamente con un JSON válido, sin markdown, con esta forma exacta:
{"comprehension_score":0,"ai_qualitative_summary":"...","points_awarded":0}
- comprehension_score es un entero de 0 a 100. Mide asimilación: matices, relación de ideas y honestidad, no memorización literal.
- ai_qualitative_summary son 2 o 3 frases en español, cálidas y concretas, sin nombre del lector.
- points_awarded es un entero de 0 a 50, cercano a la mitad del score.`;

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) {
    throw httpError('messages debe ser un arreglo', 400);
  }
  return messages.slice(-12).map((message) => {
    const role = message && (message.role === 'assistant' || message.role === 'user') ? message.role : '';
    const content = String((message && message.content) || '').trim().slice(0, 2000);
    if (!role || !content) return null;
    return { role, content };
  }).filter(Boolean);
}

function looksLikeJson(text) {
  const trimmed = String(text || '').trim();
  return trimmed.startsWith('{') || trimmed.startsWith('```');
}

function extractJson(text) {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : trimmed;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw httpError('La IA no devolvió el JSON de cierre', 502);
  }
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw httpError('La IA no devolvió el JSON de cierre', 502);
  }
}

function clampScore(value) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

function clampPoints(value, score) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return Math.round(score / 2);
  return Math.max(0, Math.min(50, number));
}

function fallbackQuestion(userTurns, title) {
  const questions = [
    `¿Qué se te quedó dando vueltas de "${title}"?`,
    '¿Qué le contarías a alguien para que entendiera por qué esa parte importa?',
    '¿Cambió algo en cómo miras esa historia ahora que la terminaste?'
  ];
  return questions[Math.min(userTurns, 2)];
}

async function evaluateComprehension({ sessionId, userId, title, author, messages }) {
  const session = await ReadingSession.findById(sessionId);
  if (!session) throw httpError('Sesión de lectura no encontrada', 404);
  if (Number(session.user_id) !== Number(userId)) {
    throw httpError('Esta conversación pertenece a otro lector', 403);
  }

  if (session.comprehension_status === 'VALIDADO') {
    return {
      done: true,
      provider: 'stored',
      reply: null,
      comprehension_score: session.comprehension_score,
      ai_qualitative_summary: session.ai_qualitative_summary,
      points_awarded: session.earned_reader_points,
      session
    };
  }

  if (session.comprehension_status !== 'PENDIENTE_VALIDACION') {
    throw httpError('La sesión todavía no está lista para la conversación de cierre', 409);
  }

  const bookTitle = session.title || String(title || '').trim();
  const bookAuthor = session.author || String(author || '').trim();
  if (!bookTitle) throw httpError('No se pudo identificar el libro de la sesión', 400);

  const history = sanitizeMessages(messages);
  const userTurns = history.filter((message) => message.role === 'user').length;
  const isFinal = userTurns >= 3;
  const system = `${SOCRATIC_PROMPT}

Libro: "${bookTitle}"${bookAuthor ? ` de ${bookAuthor}` : ''}.
El lector ha respondido ${userTurns} veces.
${isFinal
    ? 'Este es el último turno. Responde solo con el JSON pedido.'
    : 'Responde solo con la siguiente pregunta, en texto plano.'}`;

  const completion = await complete({
    system,
    messages: history,
    temperature: isFinal ? 0.3 : 0.7,
    json: isFinal
  });

  if (!isFinal) {
    const reply = looksLikeJson(completion.text)
      ? fallbackQuestion(userTurns, bookTitle)
      : String(completion.text).trim();
    return {
      done: false,
      provider: completion.provider,
      reply,
      questions_asked: userTurns,
      questions_remaining: 3 - userTurns,
      session_id: session.id
    };
  }

  const parsed = extractJson(completion.text);
  const score = clampScore(parsed.comprehension_score);
  const points = clampPoints(parsed.points_awarded, score);
  const summary = String(parsed.ai_qualitative_summary || '').trim().slice(0, 2000);
  if (!summary) throw httpError('La IA no escribió la retroalimentación', 502);

  const updated = await ReadingSession.markValidated(session.id, {
    score,
    summary,
    points
  });

  return {
    done: true,
    provider: completion.provider,
    reply: null,
    comprehension_score: score,
    ai_qualitative_summary: summary,
    points_awarded: points,
    session: updated
  };
}

module.exports = { evaluateComprehension };
