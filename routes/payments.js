const express = require("express");
const router = express.Router();
const Payment = require("../models/Payment");
const Issue = require("../models/Issue");
const { v4: uuidv4 } = require("uuid");

// POST /api/payments/boost
// body: { issueId, amount, currency, payer: { uid, email, name } }
router.post("/boost", async (req, res) => {
  try {
    const { issueId, amount, currency, payer } = req.body;
    if (!issueId || !amount) return res.status(400).json({ error: "issueId and amount required" });

    // simulate payment success (replace with real PG)
    const transactionId = "TXN-" + uuidv4();
    const payment = new Payment({
      id: uuidv4(),
      issueId,
      payerUid: payer?.uid,
      payerEmail: payer?.email,
      amount,
      currency: currency || "BDT",
      transactionId,
      status: "success"
    });
    await payment.save();

    // update issue: set priority high and add timeline
    const note = `Boosted by ${payer?.email || payer?.uid || "user"} txn:${transactionId}`;
    await Issue.findOneAndUpdate({ id: issueId }, {
      $set: { priority: "high", updatedAt: new Date() },
      $push: { timeline: { eventType: "boost_payment", status: "in_progress", note, updatedBy: payer?.email || payer?.uid, at: new Date() } }
    });

    return res.json({ success: true, transactionId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Payment failed" });
  }
});

module.exports = router;
