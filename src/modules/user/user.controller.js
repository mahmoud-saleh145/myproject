import connectToDB from '../../../db/connectionDB.js';
import { sendEmail } from '../../serves/sendEmail.js';
import { AppError } from '../../utils/classError.js';
import { asyncHandler } from '../../utils/globalErrorHandling.js';
import userModel from './../../../db/models/user.model.js';
import cartModel from "../../../db/models/cart.model.js";
import wishListModel from './../../../db/models/wishlist.js';
import jwt from "jsonwebtoken";


export const getUsers = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const users = await userModel.find();
    res.status(200).json({ msg: "success", users: users })
})

export const authUser = asyncHandler(async (req, res, next) => {
    await connectToDB();

    const { email } = req.body;
    const emailRegex = /^[A-Za-z0-9._%+-]{2,}@[A-Za-z0-9.-]+\.(com)$/;

    if (!emailRegex.test(email)) {
        return next(new AppError("Invalid email format", 400));
    }

    let user = await userModel.findOne({ email }).populate("orders.orderId");

    if (!user) {
        user = new userModel({ email });
        await user.save();

        await sendEmail(email, "Welcome!", "<h1>Your account has been created.</h1>");
    }

    const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
        mergeCartAuto(sessionId, user._id);
        mergeWishlistAuto(sessionId, user._id);
    }

    res.clearCookie("sessionId", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/"
    })

    const finalUserData = await userModel.findById(user._id)
        .populate("orders.orderId");

    res.status(200).json({
        msg: "success",
        token,
        user: finalUserData,
    });
});


const mergeCartAuto = asyncHandler(async (sessionId, userId) => {
    const sessionCart = await cartModel.findOne({ sessionId });
    const userCart = await cartModel.findOne({ userId });

    if (!sessionCart && !userCart) return;

    // userCart مش موجود = نحول sessionCart له
    if (sessionCart && !userCart) {
        sessionCart.userId = userId;
        sessionCart.sessionId = undefined;
        await sessionCart.save();
        return;
    }

    if (!sessionCart) return;

    // لو sessionCart فاضي
    if (sessionCart.items.length === 0) {
        await sessionCart.deleteOne();
        return;
    }

    // دمج العناصر
    for (const item of sessionCart.items) {
        const existing = userCart.items.find(i =>
            i.productId.toString() === item.productId.toString() &&
            i.color === item.color
        );

        if (existing) {
            existing.quantity += item.quantity;
        } else {
            userCart.items.push({
                productId: item.productId,
                quantity: item.quantity,
                color: item.color
            });
        }
    }

    await userCart.save();
    await sessionCart.deleteOne();
});


const mergeWishlistAuto = asyncHandler(async (sessionId, userId) => {
    const sessionWish = await wishListModel.findOne({ sessionId });
    const userWish = await wishListModel.findOne({ userId });

    if (!sessionWish && !userWish) return;

    if (sessionWish && !userWish) {
        sessionWish.userId = userId;
        sessionWish.sessionId = undefined;
        await sessionWish.save();
        return;
    }

    if (!sessionWish) return;

    // دمج العناصر بدون تكرار
    sessionWish.items.forEach(item => {
        const exists = userWish.items.find(i =>
            i.productId.toString() === item.productId.toString()
        );
        if (!exists) userWish.items.push({ productId: item.productId });
    });

    await userWish.save();
    await sessionWish.deleteOne();
});



export const getUserInfo = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const userId = req.user ? req.user._id : null;
    if (!userId) {
        return next(new AppError("User not logged in", 401));
    }
    const user = await userModel.findById(userId).populate({
        path: "orders.orderId",
        populate: {
            path: "products.productId",
            select: "-createdAt -hide -raise -discount -reserved -stock ", // الحقول اللي انت عايزها فقط
        }
    });
    if (!user) {
        return next(new AppError("User not found", 404));
    }
    res.status(200).json({ msg: "success", user });
});


export const updateUser = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const { id } = req.body;
    const {
        email,
        firstName,
        lastName,
        address,
        phone,
        city,
        governorate
    } = req.body;

    const user = await userModel.findById(id);

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    if (email) user.email = email;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (address) user.address = address;
    if (phone) user.phone = phone;
    if (city) user.city = city;
    if (governorate) user.governorate = governorate;

    await user.save();

    res.status(200).json({
        success: true,
        message: "User updated successfully",
        user
    });
});
