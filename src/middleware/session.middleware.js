import { v4 as uuidv4 } from "uuid";

export const attachSession = (req, res, next) => {
    const origin = req.headers.origin;
    const isLocal =
        origin?.includes("localhost") ||
        req.hostname === "localhost" ||
        req.hostname === "127.0.0.1";

    const existingSession = req.cookies?.sessionId;

    if (!existingSession) {
        const newSession = uuidv4();

        res.cookie("sessionId", newSession, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // أسبوع
            secure: !isLocal, // لازم يكون true في Vercel
            sameSite: isLocal ? "lax" : "none", // none فقط لما HTTPS والدومين مختلف
            path: "/",
        });

        console.log("🟢 Created new sessionId:", newSession);
        req.sessionId = newSession;
    } else {
        console.log("✅ Existing sessionId:", existingSession);
        req.sessionId = existingSession;
    }

    next();
};
