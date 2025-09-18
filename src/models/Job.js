// src/models/Job.js
const mongoose = require('mongoose');

const SalarySchema = new mongoose.Schema({
  min: Number,
  max: Number
}, { _id: false });

const JobSchema = new mongoose.Schema({
  employer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String },
  salary: SalarySchema,
  jobType: { type: String, enum: ['full-time','part-time','contract','internship','temporary'], default: 'full-time' },
  experienceLevel: { type: String, enum: ['junior','mid','senior','lead'], default: 'mid' },
  skills: [String],
  isRemote: { type: Boolean, default: false },
  status: { type: String, enum: ['open','closed'], default: 'open' },
  viewsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date
});

// text index for basic search
JobSchema.index({ title: 'text', description: 'text', skills: 'text' });

module.exports = mongoose.model('Job', JobSchema);
