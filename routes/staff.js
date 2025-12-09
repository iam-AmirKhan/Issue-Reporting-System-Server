const express = require("express");
const router = express.Router();
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const requireRole = require("../middleware/requireRole");
const Issue = require("../models/Issue");
const User = require("../models/User");

// GET assigned issues (staff)
router.get("/assigned", verifyFirebaseToken, requireRole(["staff"]), async (req, res) => {
  try {
    const fb = req.firebaseUser;
    const user = await User.findOne({ uid: fb.uid });
    const issues = await Issue.find({ assignedTo: user._id.toString() }).sort({ boosted: -1, createdAt: -1 }).lean();
    return res.json({ ok:true, issues });
  } catch (err) { console.error(err); return res.status(500).json({ ok:false }); }
});

// Change status (staff allowed transitions validated at DB)
router.post("/issues/:id/status", verifyFirebaseToken, requireRole(["staff"]), async (req, res) => {
  try {
    const { status, message } = req.body; // status: in-progress | working | resolved | closed
    const fb = req.firebaseUser;
    const user = await User.findOne({ uid: fb.uid });
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ ok:false });

    // ensure this staff is assigned to this issue
    if (issue.assignedTo !== user._id.toString()) return res.status(403).json({ ok:false, message: "Not assigned" });

    // apply allowed transitions optionally (simple)
    issue.status = status;
    issue.timeline.unshift({ status, message: message || `Status changed to ${status}`, by: `staff:${user.name || user.email}` });
    await issue.save();
    return res.json({ ok:true, issue });
  } catch (err) { console.error(err); return res.status(500).json({ ok:false }); }
});

// Profile update
router.patch("/profile", verifyFirebaseToken, requireRole(["staff"]), async (req, res) => {
  try {
    const fb = req.firebaseUser;
    const user = await User.findOneAndUpdate({ uid: fb.uid }, req.body, { new: true });
    return res.json({ ok:true, user });
  } catch (err) { console.error(err); return res.status(500).json({ ok:false }); }
});

module.exports = router;
