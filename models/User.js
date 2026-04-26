const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  firebaseUid: { type: String, unique: true, required: true },
  photoURL: String,
  phone: String,
  role: { 
    type: String, 
    enum: ['citizen', 'staff', 'admin'], 
    default: 'citizen' 
  },
  isBlocked: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);
