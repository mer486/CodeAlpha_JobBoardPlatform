const Application = require('../models/Application');
const Resume = require('../models/Resume');
const Job = require('../models/Job');
const Notification = require('../models/Notification');

// ✅ Candidate applies to a job
exports.applyToJob = async (req, res) => {
  try {
    const candidateId = req.user.id;
    const jobId = req.params.id;
    const { resumeId } = req.body;

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Check if resume belongs to candidate
    const resume = await Resume.findOne({ _id: resumeId, candidate: candidateId });
    if (!resume) return res.status(400).json({ message: 'Invalid resume' });

    // Prevent duplicate applications
    const existing = await Application.findOne({ candidate: candidateId, job: jobId });
    if (existing) {
      return res.status(400).json({ message: 'You already applied to this job' });
    }

    // Create application
    const application = await Application.create({
      candidate: candidateId,
      job: jobId,
      resume: resumeId
    });

    // 🔔 Notify candidate
    await Notification.create({
      user: candidateId,
      message: `You applied to the job "${job.title}" successfully.`
    });

    // 🔔 Notify employer
    if (job.employer) {
      await Notification.create({
        user: job.employer,
        message: `A new candidate applied to your job "${job.title}".`
      });
    }

    res.status(201).json({ application });
  } catch (err) {
    console.error('applyToJob error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Employer updates application status (accept / reject / pending)
exports.updateApplicationStatus = async (req, res) => {
  try {
    const employerId = req.user.id;
    const { id } = req.params; // application ID
    const { status } = req.body; // accepted | rejected | pending

    if (!["accepted", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const application = await Application.findById(id).populate("job");
    if (!application) return res.status(404).json({ message: 'Application not found' });

    // Ensure only the employer of the job (or admin) can update
    if (String(application.job.employer) !== employerId && req.user.role !== "admin") {
      return res.status(403).json({ message: 'Not authorized to update this application' });
    }

    application.status = status;
    await application.save();

    // 🔔 Notify candidate about status update
    await Notification.create({
      user: application.candidate,
      message: `Your application for "${application.job.title}" has been ${status}.`
    });

    res.json({ message: 'Application status updated', application });
  } catch (err) {
    console.error('updateApplicationStatus error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Candidate gets their own applications
exports.getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ candidate: req.user.id })
      .populate("job", "title company")
      .populate("resume", "filePath");

    res.json(applications);
  } catch (err) {
    console.error('getMyApplications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ Employer gets applications for their jobs
exports.getEmployerApplications = async (req, res) => {
  try {
    const employerId = req.user.id;
    const jobs = await Job.find({ employer: employerId }).select("_id");

    const applications = await Application.find({ job: { $in: jobs } })
      .populate("candidate", "name email")
      .populate("job", "title")
      .populate("resume", "filePath");

    res.json(applications);
  } catch (err) {
    console.error('getEmployerApplications error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
