const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    let serviceAccount;
    if (process.env.FB_SERVICE_KEY) {
      const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString("utf8");
      serviceAccount = JSON.parse(decoded);
    } else {
      // Fallback for local development
      serviceAccount = require("./serviceAccountKey.json");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin initialized");
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

module.exports = admin;

