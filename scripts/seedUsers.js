const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const admin = require("../firebaseAdmin");

const usersToCreate = [
  {
    email: "admin@infracare.com",
    password: "Admin@123",
    name: "System Admin",
    role: "admin",
    photoURL: "https://i.pravatar.cc/150?u=admin",
  },
  {
    email: "staff@infracare.com",
    password: "Staff@123",
    name: "John Staff",
    role: "staff",
    photoURL: "https://i.pravatar.cc/150?u=staff",
    phone: "01700000000",
  },
  {
    email: "citizen@infracare.com",
    password: "Citizen@123",
    name: "Alice Citizen",
    role: "citizen",
    photoURL: "https://i.pravatar.cc/150?u=citizen",
  },
];

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "public_issue" });
    console.log("Connected to MongoDB...");

    for (const u of usersToCreate) {
      console.log(`Checking user: ${u.email}`);
      
      // 1. Create in Firebase if not exists
      let firebaseUid;
      try {
        const userRecord = await admin.auth().getUserByEmail(u.email);
        firebaseUid = userRecord.uid;
        console.log(`User ${u.email} already exists in Firebase.`);
      } catch (err) {
        if (err.code === "auth/user-not-found") {
          const userRecord = await admin.auth().createUser({
            email: u.email,
            password: u.password,
            displayName: u.name,
            photoURL: u.photoURL,
          });
          firebaseUid = userRecord.uid;
          console.log(`Created user ${u.email} in Firebase.`);
        } else {
          throw err;
        }
      }

      // 2. Create in MongoDB if not exists
      const existingDbUser = await User.findOne({ email: u.email });
      if (!existingDbUser) {
        await User.create({
          firebaseUid,
          name: u.name,
          email: u.email,
          role: u.role,
          photoURL: u.photoURL,
          phone: u.phone || "",
        });
        console.log(`Created user ${u.email} in MongoDB.`);
      } else {
        // Update role just in case
        existingDbUser.role = u.role;
        existingDbUser.firebaseUid = firebaseUid;
        await existingDbUser.save();
        console.log(`Updated user ${u.email} role in MongoDB.`);
      }
    }

    console.log("Seeding complete! You can now login with the 3 roles.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
};

seedUsers();
