import { v4 as uuidv4 } from "uuid";

export const attachSession = (req, res, next) => {
    const isLocal =
        req.hostname === "localhost" ||
        req.hostname === "127.0.0.1" ||
        req.headers.origin?.includes("localhost");

    if (!req.cookies.sessionId) {
        const newSession = uuidv4();

        res.cookie("sessionId", newSession, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7,
            secure: true,
            sameSite: "none",
            path: "/",
        });

        console.log("🟢 Created new sessionId:", newSession);
        req.sessionId = newSession;
    } else {
        req.sessionId = req.cookies.sessionId;
    }

    next();
};
