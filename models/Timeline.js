const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const TimelineSchema = new Schema({
  issueId: { type: Schema.Types.ObjectId, ref: 'Issue' },
  status: String,
  note: String,
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('Timeline', TimelineSchema);
