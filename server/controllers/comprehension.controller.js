const { evaluateComprehension } = require('../services/comprehension.service');

exports.evaluate = async (req, res) => {
  const sessionId = Number(req.body.session_id ?? req.body.sessionId);
  if (!sessionId) {
    return res.status(400).json({ message: 'session_id es obligatorio' });
  }

  try {
    const result = await evaluateComprehension({
      sessionId,
      userId: Number(req.userId),
      title: req.body.title || req.body.titulo,
      author: req.body.author || req.body.autor,
      messages: Array.isArray(req.body.messages) ? req.body.messages : []
    });
    res.json(result);
  } catch (error) {
    console.error('Comprensión lectora:', error.message);
    res.status(error.status || 500).json({
      message: error.message || 'No se pudo evaluar la comprensión'
    });
  }
};
