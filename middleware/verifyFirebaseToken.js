const admin = require("../firebaseAdmin");
const User = require("../models/User");

module.exports = async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded;

    let mongoUser = await User.findOne({ firebaseUid: decoded.uid });

    // Auto-create user if not found (handles first-login race condition)
    if (!mongoUser) {
      try {
        mongoUser = await User.create({
          firebaseUid: decoded.uid,
          name: decoded.name || decoded.email?.split("@")[0] || "Citizen",
          email: decoded.email || "",
          photoURL: decoded.picture || "",
          role: "citizen",
        });
        console.log("[Auth] Auto-created user for:", decoded.email);
      } catch (createErr) {
        // Might fail on duplicate — try finding again
        if (createErr.code === 11000) {
          mongoUser = await User.findOne({ email: decoded.email });
        }
        if (!mongoUser) {
          console.error("[Auth] Could not create/find user:", createErr.message);
          req.user = null;
          return next();
        }
      }
    }

    req.user = mongoUser;
    return next();
  } catch (err) {
    console.error("Token verify error:", err.message);
    return res.status(401).json({ message: "Invalid token", error: err.message });
  }
};
