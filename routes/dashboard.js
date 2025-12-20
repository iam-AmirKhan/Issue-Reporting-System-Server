const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const Payment = require('../models/Payment');

// GET /api/dashboard/stats
router.get('/stats', async (req,res)=>{
  try{
    if(!req.user) return res.status(401).json({ error:'Unauthorized' });
    const userId = mongoose.Types.ObjectId(req.user._id);

    const [issueTotals, paymentTotals] = await Promise.all([
      Issue.aggregate([
        { $match: { submitterId: userId } },
        { $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $in: ['$status', ['in-progress','working']] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        } },
      ]),
      Payment.aggregate([
        { $match: { userId: userId, status: 'success' } },
        { $group: { _id: null, totalPayments: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      issues: issueTotals[0] || { total:0, pending:0, inProgress:0, resolved:0 },
      payments: paymentTotals[0] || { totalPayments:0, count:0 }
    });
  }catch(err){ console.error(err); res.status(500).json({ error:'Server error' }); }
});

module.exports = router;
