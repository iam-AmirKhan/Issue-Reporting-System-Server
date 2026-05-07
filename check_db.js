require("dotenv").config();
const mongoose = require("mongoose");
const Issue = require("./models/Issue");

async function checkDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "public_issue" });
    console.log("Connected to MongoDB");
    const count = await Issue.countDocuments({});
    console.log("Total Issues:", count);
    const issues = await Issue.find({}).limit(5).lean();
    console.log("Sample Issues:", JSON.stringify(issues, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }
}

checkDb();
