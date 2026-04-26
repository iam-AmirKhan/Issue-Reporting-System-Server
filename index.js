require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const admin = require("./firebaseAdmin"); // Initializes Firebase Admin

const app = express();

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "https://your-frontend.vercel.app"],
}));
app.use(express.json());

// Routes Imports
const issueRoutes = require("./routes/issues");
const adminRoutes = require("./routes/admin");
const staffRoutes = require("./routes/staff");
const paymentRoutes = require("./routes/payments");
const dashboardRoutes = require("./routes/dashboard");
const userRoutes = require("./routes/users");

// Root Route
app.get("/", (req, res) => {
  res.send("Public Infrastructure Issue Reporting System API is running!");
});

// API Routes
app.use("/api/issues", issueRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Database Connection & Server Start
const uri = process.env.MONGO_URI;
if (!uri) {
  console.error("ERROR: MONGO_URI missing in .env file");
  process.exit(1);
}

async function startServer() {
  try {
    await mongoose.connect(uri, {
      dbName: "public_issue",
    });
    console.log("MongoDB connected successfully!");

    if (process.env.NODE_ENV !== "production") {
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    }
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
  }
}

startServer();

module.exports = app;
