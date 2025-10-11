import connectToDB from '../../../db/connectionDB.js';
import { sendEmail } from '../../serves/sendEmail.js';
import { AppError } from '../../utils/classError.js';
import { asyncHandler } from '../../utils/globalErrorHandling.js';
import userModel from './../../../db/models/user.model.js';
import jwt from "jsonwebtoken";


export const getUsers = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const users = await userModel.find();
    res.status(200).json({ msg: "success", users: users })
})

export const addUser = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const { email } = req.body;

    const emailRegex = /^[A-Za-z0-9._%+-]{2,}@[A-Za-z0-9.-]+\.(com)$/;

    if (!emailRegex.test(email)) {
        return next(new AppError("Invalid email format. Please provide a valid email address.", 400));
    }

    const isExist = await userModel.findOne({ email }).populate("orders.orderId");
    if (isExist) {
        return next(new AppError("This email already exists", 400));
    }


    const user = new userModel({ email });
    await user.save();


    await sendEmail(
        email,
        "Welcome to our service",
        "<h1>Thank you for registering with us!</h1><p>We're excited to have you on board.</p>"
    );


    const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );


    const isLocal = process.env.NODE_ENV !== "production";
    res.cookie("token", token, {
        httpOnly: true,
        secure: !isLocal,
        sameSite: isLocal ? "lax" : "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });


    res.status(201).json({
        msg: "success",
        user,
        token,
    });
});

export const login = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const { email } = req.body;
    const user = await userModel.findOne({ email: email }).populate("orders.orderId");
    if (!user) {
        return next(new AppError("No user found with this email", 404));
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });


    res.status(200).json({ msg: "success", user, token: token });
})


