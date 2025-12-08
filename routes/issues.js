const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/issuesController");

router.get("/", ctrl.listLatest);
router.get("/:id", ctrl.getById);

module.exports = router;
