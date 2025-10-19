import { v4 as uuidv4 } from "uuid";
import cookie from "cookie";

export const attachSession = (req, res, next) => {
    try {
        const cookies = cookie.parse(req.headers.cookie || "");
        let { sessionId } = cookies;

        const host = req.headers.host || "";
        const isLocal = host.includes("localhost") || host.includes("127.0.0.1");

        if (!sessionId) {
            sessionId = uuidv4();

            const cookieOptions = {
                httpOnly: true,
                maxAge: 1000 * 60 * 60 * 24 * 7,
                sameSite: isLocal ? "lax" : "none",
                secure: !isLocal,
                path: "/",
            };

            res.setHeader(
                "Set-Cookie",
                cookie.serialize("sessionId", sessionId, cookieOptions)
            );

            console.log("🆕 New session created:", sessionId);
        } else {
            console.log("✅ Existing session found:", sessionId);
        }

        req.sessionId = sessionId;

        next();
    } catch (err) {
        console.error("❌ Error in attachSession:", err);
        next(err);
    }
};
