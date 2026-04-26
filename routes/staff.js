const express = require("express");
const admin = require("../firebaseAdmin");
const Issue = require("../models/Issue");
const User = require("../models/User");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

function serializeStaff(user) {
  const plain = user.toObject ? user.toObject() : user;
  return {
    _id: String(plain._id),
    id: String(plain._id),
    uid: plain.firebaseUid,
    name: plain.name,
    email: plain.email,
    photoURL: plain.photoURL || "",
    avatar: plain.photoURL || "",
    phone: plain.phone || "",
    contact: plain.phone || "",
    role: "staff",
    createdAt: plain.createdAt,
  };
}

function asFirebasePhone(phone) {
  return /^\+[1-9]\d{7,14}$/.test(phone || "") ? phone : undefined;
}

router.get("/", verifyFirebaseToken, requireRole(["admin"]), async (_req, res) => {
  try {
    const staff = await User.find({ role: "staff" }).sort({ createdAt: -1 }).lean();
    const data = staff.map(serializeStaff);
    return res.json({ success: true, staff: data, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to load staff" });
  }
});

router.post("/", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const { name, email, password, phone, contact, photoURL } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      photoURL: photoURL || undefined,
      phoneNumber: asFirebasePhone(phone || contact),
    });

    const staff = await User.create({
      firebaseUid: userRecord.uid,
      name,
      email,
      photoURL: photoURL || "",
      phone: phone || contact || "",
      role: "staff",
    });

    return res.status(201).json({ success: true, staff: serializeStaff(staff), data: serializeStaff(staff) });
  } catch (err) {
    console.error("create staff error:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to create staff" });
  }
});

router.put("/:id", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const updates = {};
    ["name", "email", "photoURL"].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    if (req.body.phone !== undefined || req.body.contact !== undefined) {
      updates.phone = req.body.phone || req.body.contact || "";
    }

    const staff = await User.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!staff || staff.role !== "staff") {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    if (staff.firebaseUid) {
      await admin.auth().updateUser(staff.firebaseUid, {
        email: updates.email || staff.email,
        displayName: updates.name || staff.name,
        photoURL: updates.photoURL || undefined,
        phoneNumber: asFirebasePhone(updates.phone),
      }).catch((err) => console.warn("Firebase staff update failed:", err.message));

      if (req.body.password) {
        await admin.auth().updateUser(staff.firebaseUid, { password: req.body.password })
          .catch((err) => console.warn("Firebase staff password update failed:", err.message));
      }
    }

    return res.json({ success: true, staff: serializeStaff(staff), data: serializeStaff(staff) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to update staff" });
  }
});

router.delete("/:id", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const staff = await User.findById(req.params.id);
    if (!staff || staff.role !== "staff") {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }

    if (staff.firebaseUid) {
      await admin.auth().deleteUser(staff.firebaseUid).catch((err) => {
        console.warn("Firebase staff delete failed:", err.message);
      });
    }

    await User.deleteOne({ _id: staff._id });
    return res.json({ success: true, message: "Staff deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to delete staff" });
  }
});

router.get("/assigned", verifyFirebaseToken, requireRole(["staff"]), async (req, res) => {
  try {
    const issues = await Issue.find({ assignedStaffId: req.user._id })
      .sort({ boosted: -1, createdAt: -1 })
      .lean();
    return res.json({ success: true, issues, data: issues });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to load assigned issues" });
  }
});

router.patch("/issues/:id/status", verifyFirebaseToken, requireRole(["staff"]), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });

    if (String(issue.assignedStaffId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Not assigned to this issue" });
    }

    issue.status = req.body.status;
    issue.updatedAt = new Date();
    await issue.save();

    return res.json({ success: true, issue, data: issue });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to update status" });
  }
});

router.get("/profile", verifyFirebaseToken, requireRole(["staff"]), (req, res) => {
  return res.json({ success: true, staff: serializeStaff(req.user), data: serializeStaff(req.user) });
});

module.exports = router;
