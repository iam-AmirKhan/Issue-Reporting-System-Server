const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Issue = require('../models/Issue');
const Timeline = require('../models/Timeline');

// POST /api/payments/boost -> create pending payment record (for client to open gateway)
router.post('/boost', async (req,res)=>{
  try{
    if(!req.user) return res.status(401).json({ error:'Unauthorized' });
    const { issueId, amount } = req.body;
    const p = new Payment({ userId: req.user._id, issueId, amount, purpose: 'boost', status: 'pending' });
    await p.save();
    // Return payment record id for client to use with payment gateway
    res.json({ paymentId: p._id, clientSecret: 'MOCK' });
  }catch(err){ console.error(err); res.status(500).json({ error:'Server error' }); }
});

// POST /api/payments/webhook -> called by provider (mocked)
router.post('/webhook', async (req,res)=>{
  try{
    const { providerPaymentId, paymentId, status } = req.body;
    const payment = await Payment.findById(paymentId);
    if(!payment) return res.status(404).send('no');
    payment.status = status === 'success' ? 'success' : 'failed';
    payment.providerPaymentId = providerPaymentId;
    await payment.save();

    if (payment.status === 'success' && payment.issueId) {
      await Issue.updateOne({ _id: payment.issueId }, { $set: { boosted: true, priority: 'high', boostPaidAt: new Date() } });
      await Timeline.create({ issueId: payment.issueId, status: 'boosted', note: `Boost paid ${payment.amount}`, updatedBy: payment.userId });
    }

    res.json({ ok: true });
  }catch(err){ console.error(err); res.status(500).json({ error:'Server error' }); }
});

module.exports = router;
