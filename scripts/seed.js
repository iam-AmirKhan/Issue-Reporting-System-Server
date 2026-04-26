require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Issue = require("../models/Issue");
const User = require("../models/User");

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "public_issue" });
    console.log("Connected to MongoDB for seeding...");

    // 1. Get or create a dummy user
    let user = await User.findOne({ email: "citizen@example.com" });
    if (!user) {
      user = await User.create({
        firebaseUid: "seed-user-uid",
        name: "Seed Citizen",
        email: "citizen@example.com",
        role: "citizen",
      });
    }

    // 2. Create sample issues
    const issues = [
      {
        title: "Broken Streetlight on High Street",
        description: "The streetlight has been flickering for a week and now it is completely out. It is dangerous at night.",
        category: "Electricity & Lighting",
        location: "High Street, Block B",
        priority: "High",
        status: "Pending",
        submitterId: user._id,
        upvoteCount: 5,
        boosted: true,
      },
      {
        title: "Large Pothole near School",
        description: "A very deep pothole has formed right in front of the primary school entrance.",
        category: "Roads & Sidewalks",
        location: "Oak Lane",
        priority: "Normal",
        status: "In-Progress",
        submitterId: user._id,
        upvoteCount: 12,
      },
      {
        title: "Water Leakage in Sector 4",
        description: "Main pipe burst and water is flooding the street for the last 5 hours.",
        category: "Water & Sanitation",
        location: "Sector 4, Main Crossing",
        priority: "High",
        status: "Working",
        submitterId: user._id,
      },
      {
        title: "Garbage Overflow at Market",
        description: "The bins haven't been cleared in 3 days. Foul smell is spreading.",
        category: "Waste Management",
        location: "Old Market Square",
        priority: "Normal",
        status: "Resolved",
        submitterId: user._id,
      },
      {
        title: "Damaged Footpath",
        description: "Concrete tiles are broken and loose, causing people to trip.",
        category: "Roads & Sidewalks",
        location: "Commercial Road",
        priority: "Normal",
        status: "Resolved",
        submitterId: user._id,
      },
      {
        title: "Blocked Drain after Rain",
        description: "Heavy rain has caused debris to block the main drainage canal.",
        category: "Water & Sanitation",
        location: "Downhill Road",
        priority: "High",
        status: "Resolved",
        submitterId: user._id,
      }
    ];

    await Issue.deleteMany({ submitterId: user._id }); // Clear old seed data
    await Issue.insertMany(issues);

    console.log("Database seeded successfully with 6 sample issues!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
};

seed();
