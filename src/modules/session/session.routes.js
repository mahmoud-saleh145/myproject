import express from "express";
import { attachSession } from "../../middleware/session.middleware.js";

const router = express.Router();

router.get("/check", attachSession, (req, res) => {
    res.json({ message: "session active", sessionId: req.sessionId });
});

export default router;
