const Issue = require("../models/Issue");

const STATUS_ORDER = { resolved: 0, in_progress: 1, open: 2, pending: 3 };

exports.listLatest = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "6", 10);
    // fetch all and sort in JS (or use aggregation)
    const all = await Issue.find({}).lean();
    all.sort((a,b) => {
      const pa = (a.priority === "high") ? 0 : 1;
      const pb = (b.priority === "high") ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const s = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
      if (s !== 0) return s;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    return res.json(all.slice(0, limit));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch issues" });
  }
};

exports.getById = async (req, res) => {
  try {
    const id = req.params.id;
    const issue = await Issue.findOne({ id }).lean();
    if (!issue) return res.status(404).json({ error: "Issue not found" });
    return res.json(issue);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to load issue" });
  }
};
