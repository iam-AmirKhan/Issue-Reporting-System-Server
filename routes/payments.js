const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/paymentsController");

router.post("/boost", ctrl.boost);

module.exports = router;
