const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const Upvote = require('../models/Upvote');
const mongoose = require('mongoose');

// middleware to forbid blocked users (reuse from server.js? for simplicity re-define)
function forbidIfBlocked(req,res,next){
  if (req.user?.isBlocked) return res.status(403).json({ error: 'Your account is blocked. Contact admin.' });
  next();
}

// POST /api/issues  (create)
router.post('/', forbidIfBlocked, async (req,res)=>{
  try{
    if(!req.user) return res.status(401).json({ error:'Unauthorized' });
    // free user limit check
    const userId = req.user._id;
    if(!req.user.isPremium){
      const count = await Issue.countDocuments({ submitterId: userId });
      if (count >= 3) return res.status(403).json({ error: 'Free account limit reached. Subscribe to add more.' });
    }
    const issue = new Issue({ ...req.body, submitterId: userId });
    await issue.save();
    return res.json(issue);
  }catch(err){ console.error(err); res.status(500).json({ error:'Server error' }); }
});


router.get('/', async (req,res)=>{
  try{
    const { page=1, limit=10, search, status } = req.query;
    const match = {};
    if (search) match.$text = { $search: search };
    if (status) match.status = status;
    const issues = await Issue.find(match)
      .sort({ boosted: -1, createdAt: -1 })
      .skip((page-1)*limit)
      .limit(Number(limit));
    const total = await Issue.countDocuments(match);
    res.json({ data: issues, total });
  }catch(err){ console.error(err); res.status(500).json({ error:'Server error' }); }
});


router.post('/:id/upvote', forbidIfBlocked, async (req,res)=>{
  try{
    if(!req.user) return res.status(401).json({ error:'Unauthorized' });
    const issueId = req.params.id;
    const userId = req.user._id;
    const issue = await Issue.findById(issueId);
    if(!issue) return res.status(404).json({ error: 'Issue not found' });
    if (String(issue.submitterId) === String(userId)) return res.status(403).json({ error: 'Cannot upvote your own issue' });

    // create upvote (unique index prevents duplicate)
    try{
      await Upvote.create({ userId, issueId });
      await Issue.updateOne({ _id: issueId }, { $inc: { upvoteCount: 1 } });
      return res.json({ success: true });
    }catch(e){
      return res.status(409).json({ error: 'Already upvoted' });
    }
  }catch(err){ console.error(err); res.status(500).json({ error:'Server error' }); }
});

module.exports = router;
