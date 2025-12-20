const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const PaymentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  issueId: { type: Schema.Types.ObjectId, ref: 'Issue', default: null },
  amount: Number,
  purpose: String,
  providerPaymentId: String,
  status: { type: String, enum: ['success','failed','pending'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});
module.exports = mongoose.model('Payment', PaymentSchema);
