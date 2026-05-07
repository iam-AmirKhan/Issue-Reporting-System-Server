require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "public_issue" });
    console.log("Connected to MongoDB");
    const count = await User.countDocuments({});
    console.log("Total Users:", count);
    const users = await User.find({}).limit(5).lean();
    console.log("Sample Users:", JSON.stringify(users, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("DB Error:", err);
    process.exit(1);
  }
}

checkUsers();
