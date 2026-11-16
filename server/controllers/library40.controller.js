const ReadingSession = require('../models/reading-session.model');
const { buildOverview, buildReaderCapital } = require('../services/library40-analytics.service');
const { seedOverview } = require('../data/library40-seed');

exports.overview = async (req, res) => {
  try {
    const data = await buildOverview();
    res.json(data);
  } catch (error) {
    console.error('Analítica Biblioteca 4.0:', error.message);
    const demo = seedOverview();
    demo.warning = 'No se pudo leer la base; se muestran datos de demostración.';
    res.json(demo);
  }
};

exports.capital = async (req, res) => {
  try {
    const capital = await buildReaderCapital(Number(req.userId));
    res.json(capital);
  } catch (error) {
    console.error('Capital lector:', error.message);
    res.status(500).json({ message: 'No se pudo leer el capital lector' });
  }
};

exports.pending = async (req, res) => {
  try {
    const sessions = await ReadingSession.findPendingByUser(Number(req.userId));
    res.json({ sessions });
  } catch (error) {
    console.error('Sesiones pendientes:', error.message);
    res.status(500).json({ message: 'No se pudieron leer las sesiones de lectura' });
  }
};
