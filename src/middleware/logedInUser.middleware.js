import userModel from "../../db/models/user.model.js";
import jwt from "jsonwebtoken";

export const protectRoute = async (req, res, next) => {
    let token = req.cookies?.token;


    if (!token) {
        req.user = false;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(decoded.id);
        if (!user) {
            req.user = false;
            return next();
        }
        req.user = user;
        return next();
    } catch (err) {
        req.user = false;
        return next();
    }
};
