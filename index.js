require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowed = ["http://localhost:5173", "http://localhost:5174"];
      if (allowed.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


// -------------------------
// Mongoose model
// -------------------------
const { Schema, model, Types } = mongoose;

const IssueSchema = new Schema(
  {
    id: { type: String, required: true, unique: true }, // friendly id
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    priority: { type: String, enum: ["Normal", "High"], default: "Normal" },
    status: {
      type: String,
      enum: ["Pending", "In-Progress", "Resolved", "Closed"],
      default: "Pending",
    },
    location: { type: String },
    images: [String],
    upvotes: { type: Number, default: 0 },
    createdBy: { type: String }, // user id or email
    // ...add other fields you need
  },
  { timestamps: true }
);

const Issue = model("Issue", IssueSchema);

// -------------------------
// CONNECT TO MONGODB
// -------------------------
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

    // start server AFTER successful DB connection
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
}

// ========== ROUTES ==========

app.get("/", (req, res) => {
  res.send("Issues Server is running!");
});

// GET all issues
app.get("/api/issues", async (req, res) => {
  try {
    const docs = await Issue.find({}).lean();
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed", error: err.message });
  }
});

// GET single issue by friendly id or mongo _id
app.get("/api/issues/:key", async (req, res) => {
  try {
    const q = req.params.key;
    const orQuery = [{ id: q }];

    if (Types.ObjectId.isValid(q)) {
      orQuery.push({ _id: Types.ObjectId(q) });
    }

    const item = await Issue.findOne({ $or: orQuery }).lean();
    if (!item) return res.status(404).json({ message: "Issue not found" });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch issue" });
  }
});

// POST create issue
app.post("/api/issues", async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.id || !payload.title)
      return res.status(400).json({ message: "id and title required" });

    // optionally validate unique id exists
    const exists = await Issue.findOne({ id: payload.id }).lean();
    if (exists)
      return res
        .status(409)
        .json({ message: "An issue with that id already exists" });

    const created = await Issue.create(payload);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Create failed", error: err.message });
  }
});

// PUT update by friendly id or _id
app.put("/api/issues/:key", async (req, res) => {
  try {
    const q = req.params.key;
    const orQuery = [{ id: q }];

    if (Types.ObjectId.isValid(q)) {
      orQuery.push({ _id: Types.ObjectId(q) });
    }

    const updated = await Issue.findOneAndUpdate(
      { $or: orQuery },
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Update failed", error: err.message });
  }
});

// 404 fallback
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// global error handler
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start the server (connects to DB first)
startServer();
