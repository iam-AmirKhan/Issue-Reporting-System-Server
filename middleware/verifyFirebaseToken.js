
const initFirebaseAdmin = require("../firebaseAdmin");

module.exports = async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) return res.status(401).json({ ok:false, message: "No token provided" });

    const admin = initFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(token);
    // attach firebase decoded token
    req.firebaseUser = decoded;
    return next();
  } catch (err) {
    console.error("Token verify error:", err);
    return res.status(401).json({ ok:false, message: "Invalid token", error: err.message });
  }
};
