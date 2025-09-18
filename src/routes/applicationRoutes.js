const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/upload'); // resume upload config
const Application = require('../models/Application');
const Job = require('../models/Job');
const Notification = require('../models/Notification');

// ✅ Candidate applies for a job with resume
router.post('/:jobId/apply', authMiddleware, upload.single('resume'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const application = new Application({
      candidate: req.user._id,
      job: job._id,
      resume: req.file ? req.file.path : null,
      status: 'pending'
    });

    await application.save();
    res.status(201).json(application);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Candidate views their own applications
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const applications = await Application.find({ candidate: req.user._id })
      .populate('job', 'title company location salary');
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Employer views applications for a specific job
router.get('/job/:jobId', authMiddleware, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Ensure only job owner or admin can view applications
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only employers/admins can view applications' });
    }
    if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this job’s applications' });
    }

    const applications = await Application.find({ job: job._id })
      .populate('candidate', 'name email');
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Employer updates application status (accepted/rejected/pending)
router.put('/:appId/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const application = await Application.findById(req.params.appId).populate('job');

    if (!application) return res.status(404).json({ message: 'Application not found' });

    // Ensure only job owner or admin can update status
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only employers/admins can update status' });
    }
    if (application.job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this application' });
    }

    application.status = status;
    await application.save();

    // 🔔 Notify candidate
    await Notification.create({
      user: application.candidate,
      message: `Your application for "${application.job.title}" has been updated to "${status}".`
    });

    res.json({ message: 'Status updated', application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Candidate withdraws (deletes) their application
router.delete('/:appId', authMiddleware, async (req, res) => {
  try {
    const application = await Application.findById(req.params.appId);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    // Only candidate who applied OR admin can delete
    if (application.candidate.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this application' });
    }

    await application.deleteOne();

    res.json({ message: 'Application withdrawn successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
