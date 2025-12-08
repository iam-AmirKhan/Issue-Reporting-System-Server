require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");



const app = express();
app.use(express.json({ limit: "5mb" })); 
app.use(cors({ origin: ["http://localhost:5173"], credentials: true })); 

// connect to mongo
const uri = process.env.MONGO_URI;
mongoose.connect(uri)
  .then(() => console.log("MongoDB connected"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
// start from here






const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port", PORT));
