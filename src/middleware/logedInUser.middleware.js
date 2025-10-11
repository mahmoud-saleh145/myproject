import jwt from "jsonwebtoken";
import userModel from './../../db/models/user.model.js';

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.token; // الكوكي اللي فيها الـ JWT
        if (!token) {
            req.user = null; // مش عامل تسجيل دخول
            return next();
        }

        // فك التوكن
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // نجيب اليوزر من الداتا بيز
        const user = await userModel.findById(decoded.id);
        if (!user) {
            req.user = null;
            return next();
        }

        req.user = user; // بنخزن اليوزر في req.user
        next();

    } catch (err) {
        console.error("Auth middleware error:", err);
        req.user = null;
        next(); // نكمل عادي لكن بدون user
    }
};
