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


export const getOrders = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const { query, status, sort, page = 1, limit = 10 } = req.body;

    let search = query?.toString().trim() || "";
    let filter = {};

    // escape regex chars
    search = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (search) {
        filter.$or = [
            { randomId: { $regex: search, $options: "i" } },
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
        ];

        const isDate = /^\d{4}-\d{2}-\d{2}$/.test(search);
        if (isDate) {
            filter.$or.push({
                createdAt: {
                    $gte: new Date(`${search}T00:00:00`),
                    $lte: new Date(`${search}T23:59:59`)
                }
            });
        }
    }

    if (status && ["placed", "shipped", "delivered"].includes(status)) {
        filter.status = status;
    }

    let sortOption = { createdAt: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };

    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const total = await orderModel.countDocuments(filter);

    const orders = await orderModel
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNumber)
        .populate({
            path: "products.productId",
            select: "-createdAt -hide -raise -discount -reserved -stock"
        })
        .lean();

    res.status(200).json({
        msg: "success",
        total,
        page: pageNumber,
        pages: Math.ceil(total / limitNumber),
        limit: limitNumber,
        orders
    });
});

export const validateOrderData = (data) => {
    const {
        email,
        firstName,
        lastName,
        address,
        phone,
        city,
        governorate
    } = data || {};

    // Email
    const emailRegex = /^[A-Za-z0-9._%+-]{2,}@[A-Za-z0-9.-]+\.(com)$/;
    if (!email || !emailRegex.test(email)) {
        throw new AppError("Invalid or missing email.", 400);
    }

    // Names
    if (!firstName || firstName.length < 2) {
        throw new AppError("First name is required and must be at least 2 characters.", 400);
    }

    if (!lastName || lastName.length < 2) {
        throw new AppError("Last name is required and must be at least 2 characters.", 400);
    }

    // Address
    if (!address || address.length < 5) {
        throw new AppError("Address is too short or missing.", 400);
    }

    // Phone (Egypt format)
    const phoneRegex = /^(010|011|012|015)[0-9]{8}$/;
    if (!phone || !phoneRegex.test(phone)) {
        throw new AppError("Invalid Egyptian phone number.", 400);
    }

    // City
    if (!city || city.length < 2) {
        throw new AppError("City is required.", 400);
    }

    // Governorate
    if (!governorate || governorate.length < 2) {
        throw new AppError("Governorate is required.", 400);
    }
    return true;
}

function getFinalPrice(product) {
    const originalPrice = product.price;
    const discountAmount = product.discount ? (originalPrice * product.discount) / 100 : 0;
    const raiseAmount = product.raise ? (originalPrice * product.raise) / 100 : 0;
    return originalPrice - discountAmount + raiseAmount;
};

export const createOrder = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const sessionId = req.cookies?.sessionId;
    const userId = req.user?._id || null;
    validateOrderData(req.body);
    const { email, firstName, lastName, address, phone, city, governorate, paymentMethod = "cash" } = req.body || {};

    if (!sessionId && !userId) throw new AppError("Session or user not found", 400);

    let cart
    if (userId) {
        cart = await cartModel
            .findOne({ userId })
            .populate("items.productId", "-createdAt -updatedAt -__v -hide");

    } else if (sessionId) {
        cart = await cartModel
            .findOne({ sessionId })
            .populate("items.productId", "-createdAt -updatedAt -__v -hide");

    }


    if (!cart || !cart.items.length) throw new AppError("Cart does not exist or empty", 400);


    for (const item of cart.items) {
        const { productId, quantity, color } = item;

        const product = await productModel.findById(productId);
        if (!product) throw new AppError("Product not found", 404);


        const variant = product.variants.find(v => v.color === color);
        if (!variant) throw new AppError(`Color ${color} not found for product`, 400);

        if (variant.stock < quantity) {
            throw new AppError(`Not enough stock for color ${color} of ${product.name}`, 400);
        }

        variant.stock = Math.max(0, variant.stock - quantity);
        variant.reserved = Math.max(0, variant.reserved - quantity);


        await product.save();
    }


    const shippingCost = calculateShipping(governorate);

    const subtotal = cart.items.reduce(
        (acc, item) => acc + getFinalPrice(item.productId) * item.quantity,
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
        governorate,
        paymentMethod
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

    res.status(201).json({ msg: "success", order });
})



export const updateOrder = asyncHandler(async (req, res, next) => {
    await connectToDB();

    const { id } = req.params;
    const {
        email,
        firstName,
        lastName,
        address,
        phone,
        city,
        governorate,
        status,
        products
    } = req.body;

    const order = await orderModel.findById(id).populate("products.productId", "-createdAt -updatedAt -__v -hide")
    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }

    if (email) order.email = email;
    if (firstName) order.firstName = firstName;
    if (lastName) order.lastName = lastName;
    if (address) order.address = address;
    if (phone) order.phone = phone;
    if (city) order.city = city;
    if (governorate) order.governorate = governorate;
    if (status) order.status = status;


    if (products && Array.isArray(products)) {
        order.products = products.map(p => ({
            productId: p.productId,
            quantity: p.quantity,
            price: p.price,
            color: p.color
        }));
    }

    await order.save();

    if (order.userId) {
        const user = await userModel.findById(order.userId);

        if (user) {
            if (email) user.email = email;
            if (firstName) user.firstName = firstName;
            if (lastName) user.lastName = lastName;
            if (address) user.address = address;
            if (phone) user.phone = phone;
            if (city) user.city = city;
            if (governorate) user.governorate = governorate;

            await user.save();
        }
    }

    res.status(200).json({
        success: true,
        message: "Order updated successfully",
        order
    });
});


