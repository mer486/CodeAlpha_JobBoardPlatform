// src/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware'); // expect function exported

// Admin or Employer middleware
function adminOrEmployer(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (req.user.role === 'admin' || req.user.role === 'employer') return next();
  return res.status(403).json({ message: 'Access denied' });
}

/**
 * GET /api/reports/applications-summary
 * Summary of applications per job (total + breakdown)
 */
router.get('/applications-summary', authMiddleware, adminOrEmployer, async (req, res) => {
  try {
    let matchStage = {};
    if (req.user.role === 'employer') {
      const jobDocs = await Job.find({
        $or: [{ employer: req.user._id }, { postedBy: req.user._id }]
      }).select('_id').lean();
      const jobIds = jobDocs.map(j => j._id);
      if (jobIds.length === 0) return res.json([]);
      matchStage.job = { $in: jobIds };
    }

    const pipeline = [];
    if (Object.keys(matchStage).length) pipeline.push({ $match: matchStage });

    pipeline.push(
      {
        $group: {
          _id: '$job',
          totalApplications: { $sum: 1 },
          applied: { $sum: { $cond: [{ $eq: ['$status', 'applied'] }, 1, 0] } },
          underReview: { $sum: { $cond: [{ $in: ['$status', ['under review', 'reviewed', 'pending']] }, 1, 0] } },
          accepted: { $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: '_id',
          as: 'jobDetails'
        }
      },
      { $unwind: { path: '$jobDetails', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          jobId: '$_id',
          jobTitle: '$jobDetails.title',
          employer: '$jobDetails.employer',
          postedBy: '$jobDetails.postedBy',
          totalApplications: 1,
          applied: 1,
          underReview: 1,
          accepted: 1,
          rejected: 1
        }
      },
      { $sort: { totalApplications: -1 } }
    );

    const summary = await Application.aggregate(pipeline);
    res.json(summary);
  } catch (err) {
    console.error('reports/applications-summary error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/reports/user-stats
 * High-level counts: users, employers, candidates, jobs, applications
 */
router.get('/user-stats', authMiddleware, adminOrEmployer, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalEmployers = await User.countDocuments({ role: 'employer' });
    const totalCandidates = await User.countDocuments({ role: 'candidate' });
    const totalJobs = await Job.countDocuments();
    const totalApplications = await Application.countDocuments();

    res.json({
      totalUsers,
      totalEmployers,
      totalCandidates,
      totalJobs,
      totalApplications
    });
  } catch (err) {
    console.error('reports/user-stats error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/reports/top-jobs
 * Returns top N jobs by number of applications (default 5)
 */
router.get('/top-jobs', authMiddleware, adminOrEmployer, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const topJobs = await Application.aggregate([
      { $group: { _id: '$job', applicationCount: { $sum: 1 } } },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: '_id',
          as: 'jobDetails'
        }
      },
      { $unwind: '$jobDetails' },
      {
        $project: {
          jobId: '$_id',
          jobTitle: '$jobDetails.title',
          applicationCount: 1
        }
      },
      { $sort: { applicationCount: -1 } },
      { $limit: limit }
    ]);

    res.json(topJobs);
  } catch (err) {
    console.error('reports/top-jobs error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/reports/recent-users
 * Returns last 10 registered users
 */
router.get('/recent-users', authMiddleware, adminOrEmployer, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(10).select('-password');
    res.json(users);
  } catch (err) {
    console.error('reports/recent-users error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
