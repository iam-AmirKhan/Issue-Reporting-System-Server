
const express = require("express");
const router = express.Router();
const Issue = require("../models/Issue");
const mockAuth = require("../middleware/mockAuth");

// use mockAuth to get req.user (optional)
router.use(mockAuth);

/**
 * GET /api/issues
 * optional query: ?limit=10
 */
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "0", 10) || 0;
    // boosted first, then newest
    const q = Issue.find({}).sort({ boosted: -1, updatedAt: -1 });
    if (limit > 0) q.limit(limit);
    const items = await q.exec();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: "Failed to load issues" });
  }
});

/**
 * GET /api/issues/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const it = await Issue.findById(req.params.id).exec();
    if (!it) return res.status(404).json({ message: "Not found" });
    res.json(it);
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});

/**
 * POST /api/issues
 * body: { title, description, image, category, location }
 * requires logged-in user (x-user-id header)
 */
router.post("/", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required (send x-user-id header)" });
    const { title, description, image, category, location } = req.body;
    if (!title) return res.status(400).json({ message: "Title required" });

    const issue = new Issue({
      title, description, image, category, location,
      createdBy: req.user.id,
    });
    await issue.save();
    res.status(201).json(issue);
  } catch (err) {
    res.status(500).json({ message: "Create failed" });
  }
});

/**
 * PUT /api/issues/:id
 * update fields (owner-only)
 */
router.put("/:id", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Not found" });
    if (issue.createdBy !== req.user.id) return res.status(403).json({ message: "Not allowed" });

    const updatable = ["title","description","image","category","location","status"];
    updatable.forEach(k => { if (req.body[k] !== undefined) issue[k] = req.body[k]; });

    await issue.save();
    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

/**
 * DELETE /api/issues/:id
 * owner-only
 */
router.delete("/:id", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Not found" });
    if (issue.createdBy !== req.user.id) return res.status(403).json({ message: "Not allowed" });

    await Issue.deleteOne({ _id: issue._id });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

/**
 * POST /api/issues/:id/upvote
 * requires login via x-user-id header
 * rules: cannot upvote own issue, only once per user
 */
router.post("/:id/upvote", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Not found" });

    if (issue.createdBy === req.user.id) return res.status(400).json({ message: "Cannot upvote your own issue" });

    if (issue.upvoters && issue.upvoters.includes(req.user.id)) {
      // idempotent
      return res.json(issue);
    }

    issue.upvoters = issue.upvoters || [];
    issue.upvoters.push(req.user.id);
    issue.upvoteCount = (issue.upvoteCount || 0) + 1;
    await issue.save();
    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: "Upvote failed" });
  }
});

/**
 * POST /api/issues/:id/boost
 * mock payment: requires login
 * toggles boosted + priority=high
 */
router.post("/:id/boost", async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Not found" });

    if (issue.boosted) return res.json({ message: "Already boosted", issue });

    // Here you would verify payment — we mock success
    issue.boosted = true;
    issue.priority = "high";
    await issue.save();
    res.json(issue);
  } catch (err) {
    res.status(500).json({ message: "Boost failed" });
  }
});

module.exports = router;
