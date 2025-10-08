import { v4 as uuidv4 } from "uuid";

export const attachSession = (req, res, next) => {
    const isLocal = req.hostname === "localhost" || req.hostname === "127.0.0.1";

    if (!req.cookies.sessionId) {
        const newSession = uuidv4();
        res.cookie("sessionId", newSession, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7, // أسبوع
            secure: !isLocal,                // لو انت في local => false
            sameSite: isLocal ? "lax" : "none", // علشان تشتغل cross-site
        });
        req.sessionId = newSession;
    } else {
        req.sessionId = req.cookies.sessionId;
    }

    next();
};
