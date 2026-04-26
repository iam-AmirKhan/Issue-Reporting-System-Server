const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const IssueSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  location: { type: String, required: true },
  priority: { 
    type: String, 
    enum: ['Normal', 'High'], 
    default: 'Normal' 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'In-Progress', 'Working', 'Resolved', 'Closed', 'Rejected'], 
    default: 'Pending' 
  },
  images: [{ type: String }],
  submitterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignedStaffId: { type: Schema.Types.ObjectId, ref: 'User' },
  upvoteCount: { type: Number, default: 0 },
  upvotedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }], // to track single upvote
  boosted: { type: Boolean, default: false },
  boostPaidAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

IssueSchema.index({ title: 'text', description: 'text', category: 'text', location: 'text' });

module.exports = mongoose.model('Issue', IssueSchema);
