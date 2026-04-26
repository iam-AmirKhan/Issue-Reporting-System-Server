module.exports = function requireRole(roles = []) {
  return function (req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not synced or not found" });
      }

      if (req.user.isBlocked) {
        return res.status(403).json({ message: "Your account is blocked. Please contact authorities." });
      }

      if (roles.length > 0 && !roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied: insufficient permissions" });
      }

      next();
    } catch (err) {
      console.error("requireRole error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};
