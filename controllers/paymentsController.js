
const Payment = require("../models/Payment");
const Issue = require("../models/Issue");
const { v4: uuidv4 } = require("uuid");

exports.boost = async (req, res) => {
  try {
    const { issueId, amount, currency, payer } = req.body;
    if (!issueId || !amount) return res.status(400).json({ error: "issueId and amount required" });


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

    const now = new Date();
    const note = `Boosted by ${payer?.email || payer?.uid || "user"}. txn:${transactionId}`;
    await Issue.findOneAndUpdate(
      { id: issueId },
      {
        $set: { priority: "high", updatedAt: now },
        $push: { timeline: { eventType: "boost_payment", status: "boosted", note, updatedBy: payer?.email || payer?.uid, at: now } }
      }
    );

    return res.json({ success: true, transactionId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Payment failed" });
  }
};
