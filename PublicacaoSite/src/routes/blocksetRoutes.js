const express = require('express');
const router = express.Router();
const blocksetController = require('../controllers/blocksetController');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Get list of all uploaded blockset files
router.get('/files', blocksetController.getBlocksetFiles);
router.get('/projetos', blocksetController.getProjetos);
router.get('/ordens-servico/tag/:idTag', blocksetController.getOrdensServicoByTag);

// Get data for a specific blockset file
router.get('/data/:idPlanilha', blocksetController.getBlocksetData);

// --- NEW ROUTES FOR POWER BUILD IMPORT ---

// Initialize DB structure
router.post('/init-db', blocksetController.initImportStructure);

// Truncate import tables
router.post('/truncate', blocksetController.truncateImportTables);

// Import spreadsheet
router.post('/import', upload.single('file'), blocksetController.importPlanilha);

// Get tags by project
router.get('/tags/:idProjeto', blocksetController.getTagsByProjeto);

// Get spreadsheets by tag
router.get('/planilhas/:idProjeto/:idTag', blocksetController.getPlanilhasByTag);

// Get revisions by spreadsheet
router.post('/revisions', blocksetController.getRevisionsByPlanilha);

// Get items for processing
router.post('/processable-items', blocksetController.getProcessableItems);

// Process selected items
router.post('/process-items', blocksetController.processItems);

// Get agglutination summary (Resumo Fabricação)
router.post('/agglutination-summary', blocksetController.getAgglutinationSummary);

module.exports = router;
