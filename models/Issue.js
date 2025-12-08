const mongoose = require("mongoose");

const TimelineSchema = new mongoose.Schema({
  eventType: { type: String, required: true },
  status: { type: String },
  note: { type: String },
  updatedBy: { type: String },
  at: { type: Date, default: Date.now }
}, { _id: false });

const AssignedStaffSchema = new mongoose.Schema({
  id: String,
  name: String,
  role: String,
  contact: String
}, { _id: false });

const IssueSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, 
  title: String,
  description: String,
  image: String,
  location: String,
  status: { type: String, default: "pending" },
  priority: { type: String, default: "normal" },
  reporterId: String,
  reporterName: String,
  reporterEmail: String,
  assignedStaff: AssignedStaffSchema,
  timeline: [TimelineSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Issue", IssueSchema);
