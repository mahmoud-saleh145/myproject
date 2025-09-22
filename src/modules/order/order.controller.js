import mongoose from 'mongoose';
import { asyncHandler } from './../../utils/globalErrorHandling.js';
import { AppError } from './../../utils/classError.js';
import orderModel from '../../../db/models/order.model.js';
import cartModel from './../../../db/models/cart.model.js';
import productModel from '../../../db/models/product.model.js';
import userModel from '../../../db/models/user.model.js';
import { safeWrite } from '../../utils/safeWrite.js';
import { sendEmail } from '../../serves/sendEmail.js';
import { generateInvoice } from './../../utils/generateInvoiceHtml.js';
import { calculateShipping } from '../../utils/shippingCalculator.js';
import { generateRandomCode, orderCounter } from '../../utils/counterHelper.js';
export const createOrder = asyncHandler(async (req, res, next) => {
    const emailRegex = /^[A-Za-z0-9._%+-]{2,}@[A-Za-z0-9.-]+\.(com)$/;
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const sessionId = req.cookies.sessionId;
        const { userId, email, firstName, lastName, address, phone, city, governorate } = req.body || {};
        if (!sessionId && !userId) {
            throw new AppError("Session or user not found", 400);
        }
        if (!emailRegex.test(email)) {
            return next(new AppError("Invalid email format. Please provide a valid email address.", 400));
        }
        let cart = await cartModel.findOne(userId ? { userId } : { sessionId })
            .populate("items.productId", "-createdAt -updatedAt -__v -reserved -hide")
            .session(session);
        if (!cart || !cart.items.length) {
            throw new AppError("Cart does not exist or empty", 400);
        }
        const shippingCost = calculateShipping(governorate)
        for (const item of cart.items) {
            const { productId, quantity } = item;
            const product = await safeWrite(() =>
                productModel.findOneAndUpdate(
                    {
                        _id: productId,
                        stock: { $gte: quantity },
                        reserved: { $gte: quantity }
                    },
                    {
                        $inc: { stock: -quantity, reserved: -quantity }
                    },
                    { new: true, session }
                ))
            if (!product) {
                throw new AppError("this product is out of stock or does not have enough quantity.", 400);
            }
        }
        let totalPrice = cart.items.reduce(
            (acc, item) => acc + (Number(item.productId.price) || 0) * item.quantity,
            0
        );
        const orderNumber = await orderCounter("order", session);
        const randomId = generateRandomCode();
        const order = new orderModel({
            sessionId,
            userId,
            products: cart.items.map(item => ({
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.productId.price
            })),
            orderNumber,
            randomId,
            subtotal: totalPrice,
            shippingCost,
            totalPrice: totalPrice + shippingCost,
            email,
            firstName,
            lastName,
            address,
            phone,
            city,
            governorate
        })
        await safeWrite(() => order.save({ session }));
        await order.populate("products.productId", "-createdAt -updatedAt -__v -reserved -hide");
        cart.items = [];
        await safeWrite(() => cart.save({ session }));
        let user = await userModel.findOne({ email: email }).session(session);
        if (user) {
            let updated = false;
            if (firstName && user.firstName !== firstName) {
                user.firstName = firstName;
                updated = true;
            }
            if (lastName && user.lastName !== lastName) {
                user.lastName = lastName;
                updated = true;
            }
            if (address && user.address !== address) {
                user.address = address;
                updated = true;
            }
            if (phone && user.phone !== phone) {
                user.phone = phone;
                updated = true;
            }
            if (city && user.city !== city) {
                user.city = city;
                updated = true;
            }
            if (governorate && user.governorate !== governorate) {
                user.governorate = governorate;
                updated = true;
            }
            user.orders.push({ orderId: order._id });
            updated = true;
            if (updated) {
                await user.save({ session });
            }
        } else {
            user = new userModel({ email, firstName, lastName, address, phone, city, governorate, orders: [{ orderId: order._id }] });
            await user.save({ session });
        }
        await session.commitTransaction();
        console.log("user:", user);
        const html = generateInvoice(order);
        await sendEmail(order.email, `Order #${order.randomId} Confirmed`, html);
        res.status(201).json({ msg: "Order created successfully", order })
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        next(error);
    } finally {
        session.endSession();
    }
});



