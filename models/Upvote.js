const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const UpvoteSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  issueId: { type: Schema.Types.ObjectId, ref: 'Issue' },
  createdAt: { type: Date, default: Date.now },
});
UpvoteSchema.index({ userId: 1, issueId: 1 }, { unique: true });
module.exports = mongoose.model('Upvote', UpvoteSchema);
