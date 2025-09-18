// src/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['candidate','employer','admin'], default: 'candidate' },
  companyName: { type: String }, // optional for employers
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
