const express = require("express");
const router = express.Router();
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const requireRole = require("../middleware/requireRole");
const Issue = require("../models/Issue");
const User = require("../models/User");
const admin = require("../firebaseAdmin");

// GET all issues (Admin View)
router.get("/issues", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const issues = await Issue.find()
      .populate('submitterId', 'name email')
      .populate('assignedStaffId', 'name email')
      .sort({ boosted: -1, createdAt: -1 })
      .lean();
    return res.json({ success: true, data: issues });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Assign staff to an issue
router.post("/issues/:id/assign", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const { staffId } = req.body;
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });
    if (issue.assignedStaffId) return res.status(400).json({ success: false, message: "Already assigned" });

    const staff = await User.findById(staffId);
    if (!staff || staff.role !== "staff") return res.status(400).json({ success: false, message: "Invalid staff" });

    issue.assignedStaffId = staff._id;
    // We'll handle timeline creation in a separate step/controller as per plan, 
    // but for now, let's keep it simple to get the server running.
    await issue.save();

    return res.json({ success: true, data: issue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Reject issue
router.post("/issues/:id/reject", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false });
    if (issue.status !== "Pending") return res.status(400).json({ success: false, message: "Only pending issues can be rejected" });

    issue.status = "Rejected";
    await issue.save();
    return res.json({ success: true, data: issue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manage Users (Citizens)
router.get("/users", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const users = await User.find({ role: "citizen" }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Block/Unblock user
router.patch("/users/:id/status", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const { isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked }, { new: true });
    if (!user) return res.status(404).json({ success: false });
    return res.json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Manage Staff (CRUD)
router.post("/staff", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const { name, email, password, phone, photoURL } = req.body;
    // create in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      photoURL,
      phoneNumber: phone
    });

    // create in DB
    const newUser = await User.create({
      firebaseUid: userRecord.uid,
      name,
      email,
      photoURL,
      phone,
      role: "staff",
    });
    return res.status(201).json({ success: true, data: newUser });
  } catch (err) {
    console.error("create staff error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/staff", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const staffMembers = await User.find({ role: "staff" }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: staffMembers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete("/staff/:id", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);
    if (!staff) return res.status(404).json({ success: false });
    
    // delete from Firebase Auth
    if (staff.firebaseUid) {
      await admin.auth().deleteUser(staff.firebaseUid).catch(e => console.warn("firebase delete failed:", e.message));
    }
    await User.deleteOne({ _id: staff._id });
    return res.json({ success: true, message: "Staff deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
