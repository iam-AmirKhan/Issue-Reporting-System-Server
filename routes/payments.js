const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Issue = require('../models/Issue');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');
const requireRole = require('../middleware/requireRole');

// POST /api/payments/boost -> initiate boost payment
router.post('/boost', verifyFirebaseToken, requireRole(['citizen']), async (req, res) => {
  try {
    const { issueId, amount } = req.body;
    
    const issue = await Issue.findById(issueId);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    if (String(issue.submitterId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to boost this issue' });
    }

    const p = new Payment({ 
      userId: req.user._id, 
      issueId, 
      amount, 
      purpose: 'boost', 
      status: 'pending' 
    });
    await p.save();
    
    res.json({ success: true, paymentId: p._id, clientSecret: 'MOCK_SECRET' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/create-subscription-session', verifyFirebaseToken, requireRole(['citizen']), async (req, res) => {
  try {
    const payment = await Payment.create({
      userId: req.user._id,
      amount: 1000,
      purpose: 'subscription',
      providerPaymentId: `SUB-${Date.now()}`,
      status: 'success'
    });

    req.user.isPremium = true;
    await req.user.save();

    res.json({ success: true, payment, message: 'Premium subscription activated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Could not complete subscription' });
  }
});

router.get('/me', verifyFirebaseToken, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .populate('issueId', 'title')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, payments, data: payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load payments' });
  }
});

// GET all payments (Admin)
router.get('/', verifyFirebaseToken, requireRole(['admin']), async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('userId', 'name email')
      .populate('issueId', 'title')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, payments, data: payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
