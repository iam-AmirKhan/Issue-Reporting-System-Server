const express = require("express");
const admin = require("../firebaseAdmin");
const Issue = require("../models/Issue");
const Payment = require("../models/Payment");
const Timeline = require("../models/Timeline");
const User = require("../models/User");
const verifyFirebaseToken = require("../middleware/verifyFirebaseToken");
const requireRole = require("../middleware/requireRole");

const router = express.Router();

const STATUS_TO_DB = {
  pending: "Pending",
  open: "Pending",
  in_progress: "In-Progress",
  "in-progress": "In-Progress",
  working: "Working",
  resolved: "Resolved",
  closed: "Closed",
  rejected: "Rejected",
};

const STATUS_TO_CLIENT = {
  Pending: "pending",
  "In-Progress": "in_progress",
  Working: "working",
  Resolved: "resolved",
  Closed: "closed",
  Rejected: "rejected",
};

const PRIORITY_TO_DB = {
  normal: "Normal",
  high: "High",
  Normal: "Normal",
  High: "High",
};

function toDbStatus(status) {
  if (!status) return undefined;
  return STATUS_TO_DB[String(status).trim()] || status;
}

function toClientStatus(status) {
  if (!status) return "pending";
  return STATUS_TO_CLIENT[status] || String(status).toLowerCase().replace("-", "_");
}

function toDbPriority(priority) {
  if (!priority) return undefined;
  return PRIORITY_TO_DB[String(priority).trim()] || priority;
}

function toClientPriority(priority) {
  if (!priority) return "normal";
  return String(priority).toLowerCase();
}

function userIdOf(value) {
  if (!value) return "";
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
}

function serializeUser(user) {
  if (!user) return null;
  return {
    _id: String(user._id),
    id: String(user._id),
    uid: user.firebaseUid,
    name: user.name,
    email: user.email,
    photoURL: user.photoURL || "",
    avatar: user.photoURL || "",
    contact: user.phone || user.contact || "",
    phone: user.phone || user.contact || "",
    role: user.role,
    isPremium: !!user.isPremium,
    isBlocked: !!user.isBlocked,
    blocked: !!user.isBlocked,
  };
}

function serializeTimelineEntry(entry) {
  const plain = entry.toObject ? entry.toObject() : entry;
  return {
    _id: String(plain._id),
    id: String(plain._id),
    status: toClientStatus(plain.status),
    message: plain.note || plain.message || "Timeline updated",
    note: plain.note || plain.message || "Timeline updated",
    updatedBy: plain.updatedBy?.name || plain.updatedBy?.role || "System",
    role: plain.role || plain.updatedBy?.role || "System",
    createdAt: plain.createdAt,
    timestamp: plain.createdAt,
  };
}

function serializeIssue(issue, timeline = []) {
  const plain = issue.toObject ? issue.toObject() : issue;
  const submitter = plain.submitterId && typeof plain.submitterId === "object" ? plain.submitterId : null;
  const staff = plain.assignedStaffId && typeof plain.assignedStaffId === "object" ? plain.assignedStaffId : null;
  const images = Array.isArray(plain.images) ? plain.images.filter(Boolean) : [];
  const id = String(plain._id);
  const submitterId = userIdOf(plain.submitterId);

  return {
    ...plain,
    _id: id,
    id,
    status: toClientStatus(plain.status),
    priority: toClientPriority(plain.priority),
    image: plain.image || images[0] || "",
    images,
    photos: images.map((url) => ({ url })),
    submitterId,
    createdBy: submitterId,
    reporterId: submitterId,
    reporterName: submitter?.name || "Citizen",
    reporterPhoto: submitter?.photoURL || "",
    assignedStaffId: userIdOf(plain.assignedStaffId),
    assignedStaff: staff ? serializeUser(staff) : null,
    upvoters: (plain.upvotedBy || []).map((item) => userIdOf(item)),
    upvoteCount: plain.upvoteCount || 0,
    boosted: !!plain.boosted,
    timeline: timeline.map(serializeTimelineEntry),
  };
}

async function optionalFirebaseUser(req, _res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) return next();

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decoded;
    req.user = await User.findOne({ firebaseUid: decoded.uid });
  } catch (err) {
    console.warn("Optional token verification failed:", err.message);
  }

  return next();
}

async function createTimeline(issueId, status, note, userId) {
  return Timeline.create({
    issueId,
    status: toDbStatus(status) || status,
    note,
    updatedBy: userId || null,
  });
}

async function getIssueWithTimeline(id) {
  const issue = await Issue.findById(id)
    .populate("submitterId", "name email photoURL role")
    .populate("assignedStaffId", "name email photoURL phone role")
    .lean();

  if (!issue) return null;

  const timeline = await Timeline.find({ issueId: issue._id })
    .populate("updatedBy", "name role")
    .sort({ createdAt: -1 })
    .lean();

  return serializeIssue(issue, timeline);
}

router.get("/count", verifyFirebaseToken, async (req, res) => {
  try {
    const query = req.query.mine === "true" ? { submitterId: req.user?._id } : {};
    const count = await Issue.countDocuments(query);
    return res.json({ success: true, count });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to count issues" });
  }
});

router.get("/assigned", verifyFirebaseToken, requireRole(["staff"]), async (req, res) => {
  try {
    const issues = await Issue.find({ assignedStaffId: req.user._id })
      .populate("submitterId", "name email photoURL role")
      .populate("assignedStaffId", "name email photoURL phone role")
      .sort({ boosted: -1, createdAt: -1 })
      .lean();

    const data = issues.map((issue) => serializeIssue(issue));
    return res.json({ success: true, issues: data, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to load assigned issues" });
  }
});

router.get("/", optionalFirebaseUser, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, status, priority, mine } = req.query;
    const query = {};

    if (mine === "true") {
      if (!req.user) return res.status(401).json({ success: false, message: "Login required" });
      query.submitterId = req.user._id;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "all") {
      query.category = { $regex: `^${category}$`, $options: "i" };
    }
    if (status && status !== "all") query.status = toDbStatus(status);
    if (priority && priority !== "all") query.priority = toDbPriority(priority);

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Number(limit);

    let sortOption = { boosted: -1, createdAt: -1 };
    if (req.query.sort === "upvotes") {
      sortOption = { upvoteCount: -1, createdAt: -1 };
    } else if (req.query.sort === "oldest") {
      sortOption = { boosted: -1, createdAt: 1 };
    }

    const findQuery = Issue.find(query)
      .populate("submitterId", "name email photoURL role")
      .populate("assignedStaffId", "name email photoURL phone role")
      .sort(sortOption);

    if (limitNumber > 0) {
      findQuery.skip((pageNumber - 1) * limitNumber).limit(limitNumber);
    }

    const [issues, total] = await Promise.all([
      findQuery.lean(),
      Issue.countDocuments(query),
    ]);

    const data = issues.map((issue) => serializeIssue(issue));
    const totalPages = limitNumber > 0 ? Math.max(Math.ceil(total / limitNumber), 1) : 1;

    return res.json({
      success: true,
      issues: data,
      data,
      total,
      page: pageNumber,
      totalPages,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to load issues" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const issue = await getIssueWithTimeline(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });
    return res.json({ success: true, issue, data: issue });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to load issue" });
  }
});

router.post("/", verifyFirebaseToken, requireRole(["citizen"]), async (req, res) => {
  try {
    if (!req.user.isPremium) {
      const count = await Issue.countDocuments({ submitterId: req.user._id });
      if (count >= 3) {
        return res.status(403).json({
          success: false,
          message: "Free users can report a maximum of 3 issues. Subscribe for unlimited reporting.",
        });
      }
    }

    const { title, description, category, location } = req.body;
    const images = Array.isArray(req.body.images)
      ? req.body.images
      : [req.body.image].filter(Boolean);

    const issue = await Issue.create({
      title,
      description,
      category,
      location,
      images,
      submitterId: req.user._id,
      status: "Pending",
      priority: "Normal",
    });

    await createTimeline(issue._id, "pending", "Issue reported by citizen", req.user._id);
    const data = await getIssueWithTimeline(issue._id);
    return res.status(201).json({ success: true, issue: data, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to create issue" });
  }
});

router.post("/:id/upvote", verifyFirebaseToken, requireRole([]), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });
    if (String(issue.submitterId) === String(req.user._id)) {
      return res.status(403).json({ success: false, message: "You cannot upvote your own issue" });
    }
    if (issue.upvotedBy.some((id) => String(id) === String(req.user._id))) {
      return res.status(409).json({ success: false, message: "You already upvoted this issue" });
    }

    issue.upvotedBy.push(req.user._id);
    issue.upvoteCount += 1;
    await issue.save();

    return res.json({ success: true, upvoteCount: issue.upvoteCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to upvote issue" });
  }
});

router.post("/:id/timeline", verifyFirebaseToken, requireRole([]), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });

    const entry = await createTimeline(
      issue._id,
      req.body.status || issue.status,
      req.body.message || req.body.note || "Progress update added",
      req.user._id
    );

    return res.status(201).json({ success: true, timeline: serializeTimelineEntry(entry), data: entry });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to add timeline entry" });
  }
});

router.post("/:id/assign", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const { staffId } = req.body;
    const [issue, staff] = await Promise.all([
      Issue.findById(req.params.id),
      User.findById(staffId),
    ]);

    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });
    if (issue.assignedStaffId) return res.status(400).json({ success: false, message: "This issue already has assigned staff" });
    if (!staff || staff.role !== "staff") return res.status(400).json({ success: false, message: "Invalid staff member" });

    issue.assignedStaffId = staff._id;
    issue.updatedAt = new Date();
    await issue.save();
    await createTimeline(issue._id, "pending", `Issue assigned to Staff: ${staff.name}`, req.user._id);

    const data = await getIssueWithTimeline(issue._id);
    return res.json({ success: true, issue: data, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to assign staff" });
  }
});

router.post("/:id/reject", verifyFirebaseToken, requireRole(["admin"]), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });
    if (toClientStatus(issue.status) !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending issues can be rejected" });
    }

    issue.status = "Rejected";
    issue.updatedAt = new Date();
    await issue.save();
    await createTimeline(issue._id, "rejected", "Issue rejected by administration", req.user._id);

    const data = await getIssueWithTimeline(issue._id);
    return res.json({ success: true, issue: data, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to reject issue" });
  }
});

router.post("/:id/boost", verifyFirebaseToken, requireRole(["citizen"]), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });
    if (String(issue.submitterId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Only the reporter can boost this issue" });
    }
    if (issue.boosted) return res.status(409).json({ success: false, message: "Issue is already boosted" });

    const amount = Number(req.body.amount) || 100;
    const payment = await Payment.create({
      userId: req.user._id,
      issueId: issue._id,
      amount,
      purpose: "boost",
      status: "success",
      providerPaymentId: `BOOST-${Date.now()}`,
    });

    issue.boosted = true;
    issue.priority = "High";
    issue.boostPaidAt = new Date();
    issue.updatedAt = new Date();
    await issue.save();
    await createTimeline(issue._id, "boosted", "Priority boosted after payment", req.user._id);

    const data = await getIssueWithTimeline(issue._id);
    return res.json({ success: true, issue: data, payment, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to boost issue" });
  }
});

router.put("/:id", verifyFirebaseToken, requireRole([]), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });

    const isOwner = String(issue.submitterId) === String(req.user._id);
    const isAssignedStaff = String(issue.assignedStaffId || "") === String(req.user._id);
    const isAdmin = req.user.role === "admin";
    const nextStatus = toDbStatus(req.body.status);

    if (nextStatus) {
      if (!isAdmin && !isAssignedStaff) {
        return res.status(403).json({ success: false, message: "Only assigned staff or admin can change status" });
      }
      issue.status = nextStatus;
      issue.updatedAt = new Date();
      await issue.save();
      await createTimeline(issue._id, nextStatus, `Status changed to ${toClientStatus(nextStatus).replace("_", " ")}`, req.user._id);
    } else {
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: "Only the reporter can edit this issue" });
      }
      if (isOwner && toClientStatus(issue.status) !== "pending") {
        return res.status(403).json({ success: false, message: "Only pending issues can be edited" });
      }

      ["title", "description", "category", "location"].forEach((field) => {
        if (req.body[field] !== undefined) issue[field] = req.body[field];
      });
      if (req.body.priority) issue.priority = toDbPriority(req.body.priority);
      if (req.body.image) issue.images = [req.body.image];
      if (Array.isArray(req.body.images)) issue.images = req.body.images;
      issue.updatedAt = new Date();
      await issue.save();
      await createTimeline(issue._id, issue.status, "Issue details updated", req.user._id);
    }

    const data = await getIssueWithTimeline(issue._id);
    return res.json({ success: true, issue: data, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to update issue" });
  }
});

router.delete("/:id", verifyFirebaseToken, requireRole([]), async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: "Issue not found" });

    const isOwner = String(issue.submitterId) === String(req.user._id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Only the reporter or admin can delete this issue" });
    }

    await Promise.all([
      Issue.deleteOne({ _id: issue._id }),
      Timeline.deleteMany({ issueId: issue._id }),
    ]);

    return res.json({ success: true, message: "Issue deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to delete issue" });
  }
});

module.exports = router;
