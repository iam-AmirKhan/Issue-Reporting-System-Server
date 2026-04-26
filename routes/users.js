const express = require("express");
const User = require("../models/User");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

function serializeUser(user) {
  const plain = user.toObject ? user.toObject() : user;
  return {
    _id: String(plain._id),
    id: String(plain._id),
    uid: plain.firebaseUid,
    firebaseUid: plain.firebaseUid,
    name: plain.name,
    email: plain.email,
    photoURL: plain.photoURL || "",
    phone: plain.phone || plain.contact || "",
    contact: plain.phone || plain.contact || "",
    role: plain.role || "citizen",
    isPremium: !!plain.isPremium,
    isBlocked: !!plain.isBlocked,
    blocked: !!plain.isBlocked,
    createdAt: plain.createdAt,
  };
}

router.post("/", async (req, res) => {
  try {
    const firebaseUid = req.body.uid || req.body.firebaseUid;
    const { name, email, photoURL } = req.body;

    if (!firebaseUid || !email) {
      return res.status(400).json({ success: false, message: "Firebase UID and email are required" });
    }

    const existingAdminCount = await User.countDocuments({ role: "admin" });
    const role = req.body.role === "admin" && existingAdminCount === 0 ? "admin" : req.body.role || "citizen";

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      {
        $setOnInsert: { firebaseUid, email, role },
        $set: {
          name: name || email.split("@")[0],
          photoURL: photoURL || "",
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(201).json({ success: true, user: serializeUser(user), data: serializeUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      const user = await User.findOne({ email: req.body.email });
      if (user) return res.json({ success: true, user: serializeUser(user), data: serializeUser(user) });
    }
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to sync user" });
  }
});

router.get("/me", verifyFirebaseToken, async (req, res) => {
  try {
    let user = req.user;

    if (!user && req.firebaseUser) {
      user = await User.create({
        firebaseUid: req.firebaseUser.uid,
        name: req.firebaseUser.name || req.firebaseUser.email?.split("@")[0] || "Citizen",
        email: req.firebaseUser.email,
        photoURL: req.firebaseUser.picture || "",
        role: "citizen",
      });
    }

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.json(serializeUser(user));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to load profile" });
  }
});

router.put("/me", verifyFirebaseToken, async (req, res) => {
  try {
    const updates = {};
    ["name", "photoURL", "phone"].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    return res.json({ success: true, user: serializeUser(user), data: serializeUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to update profile" });
  }
});

router.get("/", verifyFirebaseToken, requireRole(["admin"]), async (_req, res) => {
  try {
    const users = await User.find({ role: "citizen" }).sort({ createdAt: -1 }).lean();
    const data = users.map(serializeUser);
    return res.json({ success: true, users: data, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to load users" });
  }
});

router.put("/:id/block", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: !!req.body.blocked },
      { new: true }
    );

    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, user: serializeUser(user), data: serializeUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to update user access" });
  }
});

module.exports = router;
