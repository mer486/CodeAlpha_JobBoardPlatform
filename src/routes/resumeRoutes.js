const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');
const resumeController = require('../controllers/resumeController');

// Candidate uploads resume
router.post(
  '/upload',
  auth,
  requireRole(['candidate']),
  resumeController.uploadMiddleware,
  resumeController.uploadResume
);

module.exports = router;
