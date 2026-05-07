require("dotenv").config();
const mongoose = require("mongoose");
const Issue = require("./models/Issue");

const STATUS_MAP = {
  "pending": "Pending",
  "open": "Pending",
  "in-progress": "In-Progress",
  "in_progress": "In-Progress",
  "working": "Working",
  "resolved": "Resolved",
  "closed": "Closed",
  "rejected": "Rejected"
};

const PRIORITY_MAP = {
  "normal": "Normal",
  "high": "High"
};

async function normalizeData() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "public_issue" });
    console.log("Connected to MongoDB");
    
    const issues = await Issue.find({});
    console.log(`Checking ${issues.length} issues...`);
    
    let updatedCount = 0;
    for (const issue of issues) {
      let changed = false;
      
      const currentStatus = String(issue.status).toLowerCase().replace("_", "-");
      if (STATUS_MAP[currentStatus] && issue.status !== STATUS_MAP[currentStatus]) {
        issue.status = STATUS_MAP[currentStatus];
        changed = true;
      }
      
      const currentPriority = String(issue.priority).toLowerCase();
      if (PRIORITY_MAP[currentPriority] && issue.priority !== PRIORITY_MAP[currentPriority]) {
        issue.priority = PRIORITY_MAP[currentPriority];
        changed = true;
      }
      
      if (changed) {
        await issue.save();
        updatedCount++;
      }
    }
    
    console.log(`Normalized ${updatedCount} issues.`);
    process.exit(0);
  } catch (err) {
    console.error("Normalization Error:", err);
    process.exit(1);
  }
}

normalizeData();
