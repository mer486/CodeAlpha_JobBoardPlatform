// src/controllers/reportController.js

const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');

/**
 * Generate a report of jobs, applications, and users
 * Only accessible to admin users
 */
exports.generateReport = async (req, res) => {
  try {
    // Count totals
    const totalJobs = await Job.countDocuments();
    const totalApplications = await Application.countDocuments();
    const totalUsers = await User.countDocuments();

    // Breakdown of applications per job
    const applicationsPerJob = await Application.aggregate([
      {
        $group: {
          _id: '$job', // group by job ID
          count: { $sum: 1 },
        },
      },
    ]);

    // Breakdown of users per role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totals: {
          jobs: totalJobs,
          applications: totalApplications,
          users: totalUsers,
        },
        applicationsPerJob,
        usersByRole,
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
    });
  }
};
