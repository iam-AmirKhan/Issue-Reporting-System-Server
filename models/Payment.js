
const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  issueId: String,
  payerUid: String,
  payerEmail: String,
  amount: Number,
  currency: String,
  transactionId: String,
  status: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Payment", PaymentSchema);
