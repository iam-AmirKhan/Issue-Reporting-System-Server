const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const IssueSchema = new Schema({
  title: String,
  description: String,
  category: String,
  location: { lat: Number, lng: Number, address: String },
  priority: { type: String, enum: ['normal','high'], default: 'normal' },
  status: { type: String, enum: ['pending','in-progress','working','resolved','closed','rejected'], default: 'pending' },
  submitterId: { type: Schema.Types.ObjectId, ref: 'User' },
  upvoteCount: { type: Number, default: 0 },
  boosted: { type: Boolean, default: false },
  boostPaidAt: Date,
  createdAt: { type: Date, default: Date.now },
});
IssueSchema.index({ title: 'text', description: 'text' });
module.exports = mongoose.model('Issue', IssueSchema);
