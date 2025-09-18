// src/controllers/jobController.js
const Job = require('../models/Job');

function parseSkills(skills) {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.map(s => String(s).trim()).filter(Boolean);
  if (typeof skills === 'string') return skills.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

exports.createJob = async (req, res) => {
  try {
    const employerId = req.user.id;
    const { title, description, location, salary, jobType, experienceLevel, skills, isRemote, expiresAt } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'title and description are required' });

    const job = await Job.create({
      employer: employerId,
      title,
      description,
      location,
      salary,
      jobType,
      experienceLevel,
      skills: parseSkills(skills),
      isRemote: isRemote === true || isRemote === 'true',
      expiresAt
    });

    res.status(201).json({ job });
  } catch (err) {
    console.error('createJob error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getJobs = async (req, res) => {
  try {
    const { q, location, skills, jobType, experience, remote, page = 1, limit = 10, sort } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const perPage = Math.min(100, Number(limit) || 10);

    const filter = { status: 'open' };

    if (q) filter.$text = { $search: q };
    if (location) filter.location = new RegExp(location, 'i');
    if (jobType) filter.jobType = jobType;
    if (experience) filter.experienceLevel = experience;
    if (remote === 'true' || remote === '1') filter.isRemote = true;
    if (skills) {
      const arr = Array.isArray(skills) ? skills : String(skills).split(',').map(s => s.trim());
      filter.skills = { $all: arr };
    }

    let query = Job.find(filter).populate('employer', 'name companyName');

    if (q) {
      query = query.sort({ score: { $meta: 'textScore' } }).select({ score: { $meta: 'textScore' } });
    } else {
      if (sort === 'newest') query = query.sort({ createdAt: -1 });
      else query = query.sort({ createdAt: -1 }); // default newest
    }

    const skip = (pageNum - 1) * perPage;
    const results = await query.skip(skip).limit(perPage).lean();
    const total = await Job.countDocuments(filter);

    res.json({ total, page: pageNum, limit: perPage, results });
  } catch (err) {
    console.error('getJobs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await Job.findById(jobId).populate('employer', 'name companyName');
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // increment viewsCount (non-blocking best-effort)
    Job.findByIdAndUpdate(jobId, { $inc: { viewsCount: 1 } }).catch(() => {});

    res.json({ job });
  } catch (err) {
    console.error('getJobById error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const updates = req.body;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // authorization: employer owner OR admin
    if (req.user.role !== 'admin' && String(job.employer) !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }

    // allow update of a subset of fields
    const allowed = ['title','description','location','salary','jobType','experienceLevel','skills','isRemote','status','expiresAt'];
    allowed.forEach(field => {
      if (field in updates) {
        if (field === 'skills') job[field] = parseSkills(updates[field]);
        else job[field] = updates[field];
      }
    });

    await job.save();
    const populated = await Job.findById(job._id).populate('employer', 'name companyName');
    res.json({ job: populated });
  } catch (err) {
    console.error('updateJob error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (req.user.role !== 'admin' && String(job.employer) !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }

    await Job.findByIdAndDelete(jobId);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    console.error('deleteJob error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
