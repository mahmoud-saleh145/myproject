import { v4 as uuidv4 } from "uuid";

export const attachSession = async (req, res, next) => {

    if (req.user || req.cookies?.token) {
        return next();
    }

    const existingSession = req.cookies?.sessionId;
    if (!existingSession && !req.cookies?.token) {
        const newSession = uuidv4();
        res.cookie("sessionId", newSession, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/",
        });
        // console.log("🟢 Created new sessionId:", newSession);
        req.sessionId = newSession;
    } else {
        // console.log("✅ Existing sessionId:", existingSession);
        req.sessionId = existingSession;
    }
    next();
};
