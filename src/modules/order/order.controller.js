import jwt from "jsonwebtoken";
import { asyncHandler } from './../../utils/globalErrorHandling.js';
import { AppError } from './../../utils/classError.js';
import orderModel from '../../../db/models/order.model.js';
import cartModel from './../../../db/models/cart.model.js';
import productModel from '../../../db/models/product.model.js';
import userModel from '../../../db/models/user.model.js';
import { sendEmail } from '../../serves/sendEmail.js';
import { generateInvoice } from './../../utils/generateInvoiceHtml.js';
import { calculateShipping } from '../../utils/shippingCalculator.js';
import { generateRandomCode, orderCounter } from '../../utils/counterHelper.js';
import connectToDB from '../../../db/connectionDB.js';

const verifyToken = (req, next) => {
    const token = req.cookies?.token;
    if (!token) throw new AppError("Authentication token is missing", 401);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded.id;
    } catch (err) {
        return null;
    }
};



export const getOrders = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const orders = await orderModel.find();
    res.status(200).json({ msg: "success", orders: orders })
})

export const createOrder = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const emailRegex = /^[A-Za-z0-9._%+-]{2,}@[A-Za-z0-9.-]+\.(com)$/;
    const sessionId = req.cookies.sessionId;
    const userId = verifyToken(req, next);
    const { email, firstName, lastName, address, phone, city, governorate } = req.body || {};

    if (!sessionId && !userId) throw new AppError("Session or user not found", 400);
    if (!emailRegex.test(email)) throw new AppError("Invalid email format.", 400);

    let cart = await cartModel.findOne(userId ? { userId } : { sessionId })
        .populate("items.productId", "-createdAt -updatedAt -__v -hide");

    if (!cart || !cart.items.length) throw new AppError("Cart does not exist or empty", 400);


    for (const item of cart.items) {
        const { productId, quantity, color } = item;

        const product = await productModel.findById(productId);
        if (!product) throw new AppError("Product not found", 404);


        const colorObj = product.colors.find(c => c.color === color);
        if (!colorObj) throw new AppError(`Color ${color} not found for product`, 400);


        if (colorObj.stock < quantity || colorObj.reserved < quantity) {
            throw new AppError(`Not enough stock for color ${color} of ${product.name}`, 400);
        }


        colorObj.stock = Math.max(0, colorObj.stock - quantity);
        colorObj.reserved = Math.max(0, colorObj.reserved - quantity);

        await product.save();
    }


    const shippingCost = calculateShipping(governorate);
    const subtotal = cart.items.reduce(
        (acc, item) => acc + (Number(item.productId.price) || 0) * item.quantity,
        0
    );

    const totalPrice = subtotal + shippingCost;
    const orderNumber = await orderCounter("order");
    const randomId = generateRandomCode();


    const order = new orderModel({
        sessionId,
        userId,
        products: cart.items.map(item => ({
            productId: item.productId._id,
            quantity: item.quantity,
            price: item.productId.price,
            color: item.color,
        })),
        orderNumber,
        randomId,
        subtotal,
        shippingCost,
        totalPrice,
        email,
        firstName,
        lastName,
        address,
        phone,
        city,
        governorate
    });

    await order.save();
    await order.populate("products.productId", "-createdAt -updatedAt -__v -hide");


    cart.items = [];
    await cart.save();


    let user = await userModel.findOne({ email });
    if (user) {
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (address) user.address = address;
        if (phone) user.phone = phone;
        if (city) user.city = city;
        if (governorate) user.governorate = governorate;
        user.orders.push({ orderId: order._id });
        await user.save();
    } else {
        user = new userModel({
            email,
            firstName,
            lastName,
            address,
            phone,
            city,
            governorate,
            orders: [{ orderId: order._id }]
        });
        await user.save();
    }


    const html = generateInvoice(order);
    await sendEmail(order.email, `Order #${order.randomId} Confirmed`, html);

    res.status(201).json({ msg: "Order created successfully", order });
});

export const getOrderByRandomId = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const { randomId } = req.body;
    if (!randomId) {
        return next(new AppError("Please provide order randomId", 400));
    }
    const order = await orderModel.findOne({ randomId: randomId });
    res.status(200).json({ msg: "success", order })
})


