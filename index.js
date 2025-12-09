require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const issuesRouter = require("./routes/issues");
const app = express();
app.use(express.json({ limit: "5mb" }));
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));

// -------------------------
// CONNECT TO MONGODB ATLAS
// -------------------------
const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("ERROR: MONGO_URI missing in .env file");
  process.exit(1);
}

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 5000, 
})
  .then(() => console.log(" MongoDB Atlas connected"))
  .catch((err) => {
    console.error(" MongoDB connection error:", err.message);
    process.exit(1);
  });


app.use("/api/issues", issuesRouter);

// 404 fallback
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// global error handler
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);
  res.status(500).json({ error: "Internal server error" });
});


// -------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
