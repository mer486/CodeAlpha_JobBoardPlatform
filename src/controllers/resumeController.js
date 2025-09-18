const Resume = require('../models/Resume');
const multer = require('multer');
const path = require('path');

// Storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/resumes'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

exports.uploadMiddleware = upload.single('resume');

exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const resume = await Resume.create({
      candidate: req.user.id,
      originalName: req.file.originalname,
      filePath: req.file.path
    });

    res.status(201).json({ resume });
  } catch (err) {
    console.error('uploadResume error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
