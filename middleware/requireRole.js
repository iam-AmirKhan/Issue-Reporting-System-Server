
const User = require("../models/User");

async function requireRole(roles = []) {
  return async function (req, res, next) {
    try {
      const fb = req.firebaseUser;
      if (!fb) return res.status(401).json({ ok:false, message: "Not authenticated" });
      const user = await User.findOne({ uid: fb.uid });
      if (!user) return res.status(403).json({ ok:false, message: "User not found" });
      if (!roles.includes(user.role)) {
        return res.status(403).json({ ok:false, message: "Forbidden" });
      }
      req.appUser = user; // attach DB user
      next();
    } catch (err) {
      console.error("requireRole error:", err);
      return res.status(500).json({ ok:false });
    }
  };
}

module.exports = requireRole;
