const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const Payment = require('../models/Payment');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');
const requireRole = require('../middleware/requireRole');

function statusCount(status) {
  return { $sum: { $cond: [{ $eq: ['$status', status] }, 1, 0] } };
}

router.get('/stats', verifyFirebaseToken, requireRole([]), async (req, res) => {
  try {
    const issueMatch = {};

    if (req.user.role === 'citizen') issueMatch.submitterId = req.user._id;
    if (req.user.role === 'staff') issueMatch.assignedStaffId = req.user._id;

    const [issueStats, paymentStats, latestIssues, latestPayments] = await Promise.all([
      Issue.aggregate([
        { $match: issueMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: statusCount('Pending'),
            inProgress: statusCount('In-Progress'),
            working: statusCount('Working'),
            resolved: statusCount('Resolved'),
            closed: statusCount('Closed'),
            rejected: statusCount('Rejected'),
          }
        }
      ]),
      Payment.aggregate([
        { $match: req.user.role === 'admin' ? { status: 'success' } : { userId: req.user._id, status: 'success' } },
        { $group: { _id: null, totalPayments: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Issue.find(issueMatch).sort({ createdAt: -1 }).limit(5).lean(),
      req.user.role === 'admin'
        ? Payment.find().sort({ createdAt: -1 }).limit(5).lean()
        : Payment.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(5).lean()
    ]);

    const issues = issueStats[0] || {
      total: 0,
      pending: 0,
      inProgress: 0,
      working: 0,
      resolved: 0,
      closed: 0,
      rejected: 0,
    };
    const payments = paymentStats[0] || { totalPayments: 0, count: 0 };

    return res.json({
      ...issues,
      totalPayments: payments.totalPayments,
      paymentCount: payments.count,
      latestIssues,
      latestPayments,
      data: { issues, payments, latestIssues, latestPayments }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to load dashboard stats' });
  }
});

// GET /api/dashboard/citizen-stats
router.get('/citizen-stats', verifyFirebaseToken, requireRole(['citizen']), async (req, res) => {
  try {
    const userId = req.user._id;

    const [issueStats, paymentStats] = await Promise.all([
      Issue.aggregate([
        { $match: { submitterId: userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In-Progress'] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
          }
        },
      ]),
      Payment.aggregate([
        { $match: { userId: userId, status: 'success' } },
        { 
          $group: { 
            _id: null, 
            totalPayments: { $sum: '$amount' }, 
            count: { $sum: 1 } 
          } 
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        issues: issueStats[0] || { total: 0, pending: 0, inProgress: 0, resolved: 0 },
        payments: paymentStats[0] || { totalPayments: 0, count: 0 }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
