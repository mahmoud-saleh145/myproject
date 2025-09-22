import cartModel from "../../../db/models/cart.model.js";
import { AppError } from "../../utils/classError.js";
import { asyncHandler } from "../../utils/globalErrorHandling.js";
import productModel from './../../../db/models/product.model.js';
import mongoose from "mongoose";


export const getCarts = asyncHandler(async (req, res, next) => {
    const carts = await cartModel.find().populate("items.productId");
    res.status(200).json({ msg: "success", carts: carts });
})

export const addToCart = asyncHandler(async (req, res, next) => {
    const sessionId = req.cookies.sessionId;
    const userId = req.body.userId;
    const { productId, quantity } = req.body;

    const product = await productModel.findById(productId);
    if (!product) {
        return next(new AppError("Product not found", 404));
    }
    if (product.stock < quantity) {
        return next(new AppError("Not enough stock", 400));
    }

    let cart;

    if (userId) {
        cart = await cartModel.findOne({ userId });
        if (!cart) {
            cart = new cartModel({ userId, items: [] });
        }
    } else {
        cart = await cartModel.findOne({ sessionId });
        if (!cart) {
            cart = new cartModel({ sessionId, items: [] });
        }
    }

    if (!Array.isArray(cart.items)) {
        cart.items = [];
    }
    const itemIndex = cart.items.findIndex(
        (item) => item.productId._id.toString() === productId.toString()
    );
    if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
    } else {
        cart.items.push({ productId, quantity });
    }

    product.reserved += quantity;
    await cart.save();
    await product.save();
    res.json({ message: "Item added to cart", cart });

})

export const getCart = asyncHandler(async (req, res, next) => {
    const sessionId = req.cookies.sessionId;
    const userId = req.user?._id || req.body.userId;
    let cart = null;
    if (userId) {
        cart = await cartModel.findOne({ userId }).populate("items.productId", "-createdAt -updatedAt -__v");
    } else if (sessionId) {
        cart = await cartModel.findOne({ sessionId }).populate("items.productId");
    }
    res.json(cart || { items: [] });
});

export const mergeCart = asyncHandler(async (req, res, next) => {

    const { userId } = req.body;
    const sessionId = req.cookies.sessionId;
    if (!userId) {
        return next(new AppError("User ID is required to merge carts", 400));
    }
    let guestCart = await cartModel.findOne({ sessionId });
    let userCart = await cartModel.findOne({ userId });

    if (guestCart) {
        if (!userCart) {
            guestCart.userId = userId;
            guestCart.sessionId = null;
            await guestCart.save();
            return res.json({ message: "Guest cart assigned to user", cart: guestCart });
        }

        guestCart.items.forEach((gItem) => {
            const idx = userCart.items.findIndex(
                (uItem) => uItem.productId.toString() === gItem.productId.toString()
            );
            if (idx > -1) {
                userCart.items[idx].quantity += gItem.quantity;
            } else {
                userCart.items.push(gItem);
            }
        });

        await userCart.save();
        await cartModel.deleteOne({ _id: guestCart._id });

        return res.json({ message: "Carts merged", cart: userCart });
    }

    res.json({ message: "No guest cart found" });

})

export const addQuantity = asyncHandler(async (req, res, next) => {

    const { productId, userId } = req.body;
    const sessionId = req.cookies.sessionId;

    if (!sessionId && !userId) {
        return next(new AppError("Session or user not found", 400));
    }

    const product = await productModel.findById(productId);
    if (!product) {
        return next(new AppError("Product not found", 404));
    }
    if (product.stock < 1) {

        return next(new AppError("Not enough stock", 400));

    }
    let cart;

    if (userId) {
        cart = await cartModel.findOne({ userId });
    } else {
        cart = await cartModel.findOne({ sessionId });
    }

    if (!cart) {
        return next(new AppError("Cart not found", 404));
    }

    const itemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId.toString()
    );


    if (itemIndex > -1) {


        if (product.stock < 1) {
            return next(new AppError("Not enough stock", 400));
        }

        cart.items[itemIndex].quantity += 1;


        product.stock -= 1;

        await product.save();
        await cart.save();
        res.status(200).json({ msg: "success", cart });
    } else {
        return next(new AppError("Item not found in cart", 404));
    }


})

export const reduceQuantity = asyncHandler(async (req, res, next) => {

    const { productId, userId } = req.body;
    const sessionId = req.cookies.sessionId;

    if (!sessionId && !userId) {
        return next(new AppError("Session or user not found", 400));
    }

    const product = await productModel.findById(productId);
    if (!product) {
        return next(new AppError("Product not found", 404));
    }

    let cart;
    if (userId) {
        cart = await cartModel.findOne({ userId });
    } else {
        cart = await cartModel.findOne({ sessionId });
    }

    if (!cart) {
        return next(new AppError("Cart not found", 404));
    }

    const itemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId.toString()
    );

    if (itemIndex > -1) {
        cart.items[itemIndex].quantity -= 1;


        if (cart.items[itemIndex].quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        }

        product.stock += 1;

        await product.save();
        await cart.save();

        return res.status(200).json({ msg: "success", cart });
    } else {
        return next(new AppError("Item not found in cart", 404));
    }
})

export const emptyCart = asyncHandler(async (req, res, next) => {

    const { userId } = req.body;
    const sessionId = req.cookies.sessionId;

    if (!sessionId && !userId) {
        return next(new AppError("Session or user not found", 400));
    }

    let cart;
    if (userId) {
        cart = await cartModel.findOne({ userId });
    } else {
        cart = await cartModel.findOne({ sessionId });
    }

    if (!cart) {
        return next(new AppError("Cart not found", 404));
    }

    for (let item of cart.items) {
        const product = await productModel.findById(item.productId);
        if (product) {
            product.stock += item.quantity;
            await product.save();
        }
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({ msg: "success", message: "Cart emptied successfully", cart });


})

export const removeProduct = asyncHandler(async (req, res, next) => {

    const { productId, userId } = req.body;
    const sessionId = req.cookies.sessionId;

    if (!sessionId && !userId) {
        return next(new AppError("Session or user not found", 400));
    }

    let cart;
    if (userId) {
        cart = await cartModel.findOne({ userId });
    } else {
        cart = await cartModel.findOne({ sessionId });
    }

    if (!cart) {
        return next(new AppError("Cart not found", 404));
    }

    const product = await productModel.findById(productId);
    if (!product) {
        return next(new AppError("Product not found", 404));
    }

    const itemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId.toString()
    );

    if (itemIndex === -1) {
        return next(new AppError("Item not found in cart", 404));
    }

    product.stock += cart.items[itemIndex].quantity;
    await product.save();

    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.status(200).json({ msg: "success", message: "Product removed from cart", cart });


})


