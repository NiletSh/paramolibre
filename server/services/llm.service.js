/**
 * Conexión al modelo de lenguaje de la validación de comprensión.
 *
 * Agrega estas variables a server/.env (archivo nuevo de este repo;
 * no reutilices el .env del proyecto anterior):
 *
 *   LLM_PROVIDER=openai
 *   LLM_API_KEY=
 *   LLM_MODEL=
 *   OPENAI_API_KEY=
 *   OPENAI_BASE_URL=https://api.openai.com/v1
 *   GEMINI_API_KEY=
 *
 * LLM_PROVIDER acepta "openai" o "gemini".
 * LLM_API_KEY es la clave del proveedor elegido.
 * Si queda vacía, se acepta OPENAI_API_KEY o GEMINI_API_KEY según el proveedor.
 * LLM_MODEL es opcional: gpt-4o-mini (OpenAI) o gemini-2.0-flash (Gemini).
 * Sin ninguna clave, el servicio usa un compañero socrático local para que
 * el flujo de 3 preguntas y el JSON final sigan demostrables.
 */

const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash'
};

function providerName() {
  const value = String(process.env.LLM_PROVIDER || 'openai').trim().toLowerCase();
  return value === 'gemini' ? 'gemini' : 'openai';
}

function apiKey(provider) {
  if (process.env.LLM_API_KEY) return process.env.LLM_API_KEY.trim();
  if (provider === 'gemini') return (process.env.GEMINI_API_KEY || '').trim();
  return (process.env.OPENAI_API_KEY || '').trim();
}

function modelName(provider) {
  return (process.env.LLM_MODEL || '').trim() || DEFAULT_MODELS[provider];
}

function offlineReply({ system, messages }) {
  const titleMatch = String(system).match(/Libro:\s+"([^"]+)"/);
  const title = titleMatch ? titleMatch[1] : 'este libro';
  const userTurns = messages.filter((message) => message.role === 'user').length;
  const questions = [
    `¿Qué idea o momento de "${title}" te marcó más y por qué?`,
    'Explícale el conflicto central a alguien que no lo leyó.'
  ];

  if (userTurns < 2) {
    return { provider: 'offline', text: questions[userTurns] || questions[1] };
  }

  const answers = messages.filter((message) => message.role === 'user').map((message) => message.content);
  const richness = answers.reduce((total, answer) => total + Math.min(answer.length, 180), 0);
  const score = Math.max(48, Math.min(86, 48 + Math.round(richness / 30)));
  const points = Math.round(score / 2);
  const payload = {
    comprehension_score: score,
    ai_qualitative_summary:
      `Sin LLM_API_KEY la sesión se cerró en modo local. El lector sostuvo la conversación sobre "${title}" ` +
      'con respuestas propias; la estimación mira la especificidad de lo que contó, no una rúbrica de examen.',
    points_awarded: points
  };
  return { provider: 'offline', text: JSON.stringify(payload) };
}

async function completeOpenAI({ system, messages, temperature, json }) {
  const provider = 'openai';
  const key = apiKey(provider);
  const base = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelName(provider),
      temperature,
      messages: [{ role: 'system', content: system }, ...messages],
      ...(json ? { response_format: { type: 'json_object' } } : {})
    }),
    signal: AbortSignal.timeout(25000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || 'OpenAI no respondió');
    error.status = 502;
    throw error;
  }
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    const error = new Error('OpenAI devolvió una respuesta vacía');
    error.status = 502;
    throw error;
  }
  return { provider, text };
}

async function completeGemini({ system, messages, temperature, json }) {
  const provider = 'gemini';
  const key = apiKey(provider);
  const model = modelName(provider);
  const contents = messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }]
  }));
  if (contents[0]?.role === 'model') {
    contents.unshift({
      role: 'user',
      parts: [{ text: 'Continúa la conversación de lectura a partir de lo ya dicho.' }]
    });
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          temperature,
          ...(json ? { responseMimeType: 'application/json' } : {})
        }
      }),
      signal: AbortSignal.timeout(25000)
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Gemini no respondió');
    error.status = 502;
    throw error;
  }
  const text = (data.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('').trim();
  if (!text) {
    const error = new Error('Gemini devolvió una respuesta vacía');
    error.status = 502;
    throw error;
  }
  return { provider, text };
}

async function complete({ system, messages, temperature = 0.7, json = false }) {
  const provider = providerName();
  const history = messages.length
    ? messages
    : [{ role: 'user', content: 'Acabo de terminar el libro y quiero conversar sobre lo que me dejó.' }];

  if (!apiKey(provider)) {
    return offlineReply({ system, messages });
  }

  if (provider === 'gemini') {
    return completeGemini({ system, messages: history, temperature, json });
  }
  return completeOpenAI({ system, messages: history, temperature, json });
}

module.exports = { complete, providerName };
