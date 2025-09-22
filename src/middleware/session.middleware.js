import { v4 as uuidv4 } from "uuid";

export const attachSession = (req, res, next) => {
    if (!req.cookies.sessionId) {
        const newSession = uuidv4();
        res.cookie("sessionId", newSession, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7 // أسبوع
        });
        req.sessionId = newSession;
    } else {
        req.sessionId = req.cookies.sessionId;
    }
    next();
};