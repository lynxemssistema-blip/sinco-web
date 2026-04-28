const express = require('express');
const router = express.Router();
const blocksetController = require('../controllers/blocksetController');

// Get list of all uploaded blockset files
router.get('/files', blocksetController.getBlocksetFiles);

// Get data for a specific blockset file
router.get('/data/:idPlanilha', blocksetController.getBlocksetData);

module.exports = router;
