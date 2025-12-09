
const mongoose = require("mongoose");

const IssueSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  image: String,          // simple image URL
  category: String,
  location: String,
  status: { type: String, default: "pending" }, // pending, open, in_progress, resolved, closed
  priority: { type: String, default: "normal" }, // normal | high
  boosted: { type: Boolean, default: false },
  upvoteCount: { type: Number, default: 0 },
  upvoters: [{ type: String }], // store userId as string for simplicity
  createdBy: { type: String },  // userId string
}, { timestamps: true });

module.exports = mongoose.model("Issue", IssueSchema);
