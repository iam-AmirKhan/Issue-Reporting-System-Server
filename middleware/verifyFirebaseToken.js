const admin = require("../firebaseAdmin");
const User = require("../models/User");

module.exports = async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded;

    // Attach MongoDB user
    const mongoUser = await User.findOne({ firebaseUid: decoded.uid });
    if (!mongoUser) {
      // If user not in MongoDB yet (e.g. during first sync)
      req.user = null;
    } else {
      req.user = mongoUser;
    }

    return next();
  } catch (err) {
    console.error("Token verify error:", err);
    return res.status(401).json({ message: "Invalid token", error: err.message });
  }
};
