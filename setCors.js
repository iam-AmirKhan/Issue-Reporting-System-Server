/**
 * Run this script once to set Firebase Storage CORS for local development.
 * Usage: node setCors.js
 */
const { Storage } = require("@google-cloud/storage");
const path = require("path");

// Decode the service account from env or use the file
let serviceAccount;
try {
  if (process.env.FB_SERVICE_KEY) {
    serviceAccount = JSON.parse(Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString("utf8"));
  } else {
    serviceAccount = require("./serviceAccountKey.json");
  }
} catch (e) {
  console.error("Could not load service account:", e.message);
  process.exit(1);
}

const storage = new Storage({ credentials: serviceAccount });

const corsConfig = [
  {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://issue-reporting-system.vercel.app",
      "https://issue-reporting-system-git-main.vercel.app",
    ],
    method: ["GET", "POST", "PUT", "DELETE", "HEAD"],
    maxAgeSeconds: 3600,
    responseHeader: ["Content-Type", "Authorization", "x-goog-resumable"],
  },
];

async function setCors() {
  const bucket = storage.bucket("public-issue-system.firebasestorage.app");
  await bucket.setCorsConfiguration(corsConfig);
  console.log("✅ CORS configuration set successfully for bucket:", bucket.name);
}

setCors().catch((err) => {
  console.error("❌ Error setting CORS:", err.message);
  process.exit(1);
});
