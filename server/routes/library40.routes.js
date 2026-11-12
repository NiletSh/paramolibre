const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const library40Controller = require('../controllers/library40.controller');

const router = express.Router();

router.get('/overview', authenticate, authorize(['admin']), library40Controller.overview);
router.get('/sessions/pending', authenticate, library40Controller.pending);

module.exports = router;
