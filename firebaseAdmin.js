// server/firebaseAdmin.js
const admin = require("firebase-admin");

function initFirebaseAdmin() {
  if (admin.apps && admin.apps.length) return admin;

  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

  let credential;
  if (saEnv) {
    const serviceAccount = JSON.parse(saEnv);
    credential = admin.credential.cert(serviceAccount);
  } else if (saPath) {
    const serviceAccount = require(saPath);
    credential = admin.credential.cert(serviceAccount);
  } else {
    throw new Error("No Firebase service account provided in env.");
  }

  admin.initializeApp({ credential });
  return admin;
}

module.exports = initFirebaseAdmin;
