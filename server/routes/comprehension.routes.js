const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const comprehensionController = require('../controllers/comprehension.controller');

const router = express.Router();

router.post('/evaluate', authenticate, comprehensionController.evaluate);

module.exports = router;
