"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireJwt_1 = require("../middleware/requireJwt");
const router = (0, express_1.Router)();
router.get("/secret", requireJwt_1.requireJwt, (req, res) => {
    res.json({ message: "Protected data", user: req.user });
});
exports.default = router;
