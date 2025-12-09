const express = require("express");
const router = express.Router();
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const requireRole = require("../middleware/requireRole") ;
const Issue = require("../models/Issue");
const User = require("../models/User");
const initFirebaseAdmin = require("../firebaseAdmin");
const adminSDK = initFirebaseAdmin();


router.get("/issues", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const issues = await Issue.find().sort({ boosted: -1, createdAt: -1 }).lean();
    return res.json({ ok:true, issues });
  } catch (err) {
    console.error(err); return res.status(500).json({ ok:false });
  }
});

// Assign staff to an issue (only if not assigned)
router.post("/issues/:id/assign", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const { staffId } = req.body; 
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ ok:false, message: "Issue not found" });
    if (issue.assignedTo) return res.status(400).json({ ok:false, message: "Already assigned" });

    const staff = await User.findById(staffId);
    if (!staff || staff.role !== "staff") return res.status(400).json({ ok:false, message: "Invalid staff" });

    issue.assignedTo = staff._id.toString();
    // add timeline
    issue.timeline.unshift({
      status: issue.status,
      message: `Assigned to staff: ${staff.name || staff.email}`,
      by: "admin",
    });
    await issue.save();

    return res.json({ ok:true, issue });
  } catch (err) {
    console.error(err); return res.status(500).json({ ok:false });
  }
});

// Reject issue (only when pending)
router.post("/issues/:id/reject", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ ok:false });
    if (issue.status !== "pending") return res.status(400).json({ ok:false, message: "Only pending can be rejected" });

    issue.status = "rejected";
    issue.timeline.unshift({ status: "rejected", message: "Rejected by admin", by: "admin" });
    await issue.save();
    return res.json({ ok:true, issue });
  } catch (err) {
    console.error(err); return res.status(500).json({ ok:false });
  }
});

// Manage users: list citizens
router.get("/users", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const users = await User.find({ role: "citizen" }).sort({ createdAt: -1 }).lean();
    return res.json({ ok:true, users });
  } catch (err) {
    console.error(err); return res.status(500).json({ ok:false });
  }
});

// Block / Unblock user
router.post("/users/:id/block", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ ok:false });
    user.isBlocked = true;
    await user.save();
    return res.json({ ok:true, user });
  } catch (err) {
    console.error(err); return res.status(500).json({ ok:false });
  }
});
router.post("/users/:id/unblock", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ ok:false });
    user.isBlocked = false;
    await user.save();
    return res.json({ ok:true, user });
  } catch (err) {
    console.error(err); return res.status(500).json({ ok:false });
  }
});


router.post("/staff", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const { name, email, password, phone, photoURL } = req.body;
    // create in Firebase Auth
    const userRecord = await adminSDK.auth().createUser({ email, password, displayName: name, photoURL, phoneNumber: phone });
    // create in DB
    const newUser = await User.create({
      uid: userRecord.uid,
      name,
      email,
      photoURL,
      role: "staff",
    });
    return res.json({ ok:true, staff: newUser });
  } catch (err) {
    console.error("create staff error:", err);
    return res.status(500).json({ ok:false, message: err.message });
  }
});

// Update / delete staff
router.patch("/staff/:id", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const u = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ ok:true, user: u });
  } catch (err) { console.error(err); return res.status(500).json({ ok:false }); }
});
router.delete("/staff/:id", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);
    if (!staff) return res.status(404).json({ ok:false });
    // optionally delete firebase user too
    if (staff.uid) {
      await adminSDK.auth().deleteUser(staff.uid).catch(e => console.warn("firebase delete failed:", e.message));
    }
    await User.deleteOne({ _id: staff._id });
    return res.json({ ok:true });
  } catch (err) { console.error(err); return res.status(500).json({ ok:false }); }
});

module.exports = router;
