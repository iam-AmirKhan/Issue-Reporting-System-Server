const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const UserSchema = new Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  role: { type: String, enum: ['citizen','staff','admin'], default: 'citizen' },
  isBlocked: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('User', UserSchema);
