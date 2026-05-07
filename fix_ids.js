require("dotenv").config();
const mongoose = require("mongoose");
const Issue = require("./models/Issue");

async function fixIds() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "public_issue" });
    console.log("Connected to MongoDB");
    
    const issuesWithNullId = await Issue.find({ id: null });
    console.log(`Found ${issuesWithNullId.length} issues with null ID`);
    
    for (const issue of issuesWithNullId) {
      const newId = 'issue-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
      await Issue.updateOne({ _id: issue._id }, { $set: { id: newId } });
      console.log(`Updated issue ${issue._id} with new ID: ${newId}`);
    }
    
    console.log("Cleanup complete");
    process.exit(0);
  } catch (err) {
    console.error("Cleanup Error:", err);
    process.exit(1);
  }
}

fixIds();
