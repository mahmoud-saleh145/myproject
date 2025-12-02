import connectToDB from "../../../db/connectionDB.js";
import cartModel from "../../../db/models/cart.model.js";
import { AppError } from "../../utils/classError.js";
import { asyncHandler } from "../../utils/globalErrorHandling.js";
import productModel from "../../../db/models/product.model.js";


export const getCarts = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const carts = await cartModel.find().populate("items.productId");
    res.status(200).json({ msg: "success", carts });
});

export const addToCart = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const sessionId = req.cookies.sessionId;
    const userId = req.user?._id;

    if (!sessionId && !userId) {
        return next(new AppError("Session or user not found", 400));
    }
    const { productId, quantity = 1, color } = req.body;

    const product = await productModel.findById(productId);
    if (!product) return next(new AppError("Product not found", 404));

    const colorVariant = product.variants.find(v => v.color === color); if (!colorVariant)
        return next(new AppError("Selected color not found for this product", 400));

    if (colorVariant.stock === colorVariant.reserved) {
        return res.json({
            msg: "No more stock available for this product",
            stockLimitReached: true
        });
    }

    const available = colorVariant.stock - colorVariant.reserved;
    if (available < quantity) {
        return res.json({
            msg: "No more stock available for this product",
            stockLimitReached: true
        });
    }

    let cart
    if (userId) {
        cart = await cartModel
            .findOne({ userId })
            .populate("items.productId");
    } else if (sessionId) {
        cart = await cartModel
            .findOne({ sessionId })
            .populate("items.productId");
    }

    if (!cart) {
        cart = new cartModel({
            userId: userId || undefined,
            sessionId: sessionId || undefined,
            items: [],
        });
    }

    const itemIndex = cart.items.findIndex(
        item => {
            const idInWishlist =
                typeof item.productId === "string"
                    ? item.productId
                    : item.productId?._id;
            return idInWishlist.toString() === productId.toString() && item.color === color
        }
    );

    if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
    } else {
        cart.items.push({ productId, quantity, color });
    }

    colorVariant.reserved += quantity;
    await cart.save();
    await product.save();

    res.status(200).json({ msg: "success", cart });
});

function getFinalPrice(product) {
    const originalPrice = product.price;

    const discountAmount = product.discount ? (originalPrice * product.discount) / 100 : 0;
    const raiseAmount = product.raise ? (originalPrice * product.raise) / 100 : 0;

    return originalPrice - discountAmount + raiseAmount;
};

export const getCart = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const sessionId = req.cookies.sessionId;
    const userId = req.user?._id;
    if (!sessionId && !userId)
        return next(new AppError("Session or user not found", 400));

    let cart
    if (userId) {
        cart = await cartModel
            .findOne({ userId })
            .populate("items.productId");
    } else if (sessionId) {
        cart = await cartModel
            .findOne({ sessionId })
            .populate("items.productId");
    }

    if (!cart && sessionId) {
        cart = await cartModel.create({ sessionId, items: [] });
    }
    const subtotal = cart.items.reduce(
        (acc, item) => acc + getFinalPrice(item.productId) * item.quantity,
        0
    );
    const totalQuantity = cart.items.reduce(
        (acc, item) => acc + item.quantity,
        0
    );

    res.json({ totalQuantity, subtotal, cart: cart || { items: [] } });

});

export const getCartQuantity = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const sessionId = req.cookies.sessionId;
    const userId = req.user?._id;
    if (!sessionId && !userId)
        return res.json({ msg: "user not found", totalQuantity: 0 });

    let cart
    if (userId) {
        cart = await cartModel
            .findOne({ userId })
            .populate("items.productId");
    } else if (sessionId) {
        cart = await cartModel
            .findOne({ sessionId })
            .populate("items.productId");
    }

    if (!cart && sessionId) {
        cart = await cartModel.create({ sessionId, items: [] });
    }

    const totalQuantity = cart.items.reduce(
        (acc, item) => acc + item.quantity,
        0
    );

    res.json({ totalQuantity });
});

export const addQuantity = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const { productId, color } = req.body;
    const userId = req.user?._id;
    const sessionId = req.cookies.sessionId || req.body.sessionId;

    if (!sessionId && !userId) {
        return next(new AppError("Session or user not found", 400));
    }

    const product = await productModel.findById(productId);
    if (!product) return next(new AppError("Product not found", 404));

    let cart = userId
        ? await cartModel.findOne({ userId })
        : await cartModel.findOne({ sessionId });

    if (!cart) return next(new AppError("Cart not found", 404));

    const itemIndex = cart.items.findIndex(
        item => {
            const idInWishlist =
                typeof item.productId === "string"
                    ? item.productId
                    : item.productId?._id;
            return idInWishlist.toString() === productId.toString() && item.color === color
        }
    );

    if (itemIndex === -1)
        return next(new AppError("Item not found in cart", 404));

    const itemColor = color || cart.items[itemIndex].color;
    const colorVariant = product.variants.find(v => v.color === itemColor);

    if (!colorVariant)
        return next(new AppError("Selected color not found", 400));

    const available = colorVariant.stock - colorVariant.reserved;
    if (available < 1) {
        return res.status(200).json({
            msg: "No more stock available for this product",
            stockLimitReached: true
        });
    }


    cart.items[itemIndex].quantity += 1;
    colorVariant.reserved += 1;

    await product.save();
    await cart.save();

    res.status(200).json({ msg: "success", cart });
});

export const reduceQuantity = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const { productId, color } = req.body;
    const userId = req.user?._id;
    const sessionId = req.cookies.sessionId || req.body.sessionId;

    if (!sessionId && !userId)
        return next(new AppError("Session or user not found", 400));

    const product = await productModel.findById(productId);
    if (!product) return next(new AppError("Product not found", 404));

    const cart = userId
        ? await cartModel.findOne({ userId })
        : await cartModel.findOne({ sessionId });

    if (!cart) return next(new AppError("Cart not found", 404));

    const itemIndex = cart.items.findIndex(
        item => {
            const idInWishlist =
                typeof item.productId === "string"
                    ? item.productId
                    : item.productId?._id;
            return idInWishlist.toString() === productId.toString() && item.color === color
        }
    );

    if (itemIndex === -1)
        return next(new AppError("Item not found in cart", 404));

    const itemColor = color || cart.items[itemIndex].color;
    const colorVariant = product.variants.find(v => v.color === itemColor);

    if (!colorVariant)
        return next(new AppError("Selected color not found", 400));

    cart.items[itemIndex].quantity -= 1;
    colorVariant.reserved = Math.max(0, colorVariant.reserved - 1);

    if (cart.items[itemIndex].quantity <= 0) {
        cart.items.splice(itemIndex, 1);
    }

    await product.save();
    await cart.save();

    res.status(200).json({ msg: "success", cart });
});

export const emptyCart = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const userId = req.user?._id;
    const sessionId = req.cookies.sessionId;

    if (!sessionId && !userId)
        return next(new AppError("Session or user not found", 400));

    let cart
    if (userId) {
        cart = await cartModel
            .findOne({ userId })
            .populate("items.productId");
    } else if (sessionId) {
        cart = await cartModel
            .findOne({ sessionId })
            .populate("items.productId");
    }
    if (!cart) return next(new AppError("Cart not found", 404));

    for (const item of cart.items) {
        const product = await productModel.findById(item.productId);
        if (!product) continue;

        const colorVariant = product.variants.find(c => c.color === item.color);
        if (colorVariant) {
            colorVariant.reserved -= item.quantity;
            if (colorVariant.reserved < 0) colorVariant.reserved = 0;
            await product.save();
        }
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({ msg: "success", cart });
});

export const removeProduct = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const { productId, color } = req.body;
    const userId = req.user?._id;
    const sessionId = req.cookies.sessionId;

    if (!sessionId && !userId)
        return next(new AppError("Session or user not found", 400));

    let cart
    if (userId) {
        cart = await cartModel
            .findOne({ userId })
            .populate("items.productId");
    } else if (sessionId) {
        cart = await cartModel
            .findOne({ sessionId })
            .populate("items.productId");
    }
    if (!cart) return next(new AppError("Cart not found", 404));

    const product = await productModel.findById(productId);
    if (!product) return next(new AppError("Product not found", 404));

    const itemIndex = cart.items.findIndex(
        item => {
            const idInWishlist =
                typeof item.productId === "string"
                    ? item.productId
                    : item.productId?._id;
            return idInWishlist.toString() === productId.toString() && item.color === color
        }
    );

    if (itemIndex === -1)
        return next(new AppError("Item not found in cart", 404));

    const item = cart.items[itemIndex];

    const colorVariant = product.variants.find(v => v.color === item.color);
    if (colorVariant) {
        colorVariant.reserved -= item.quantity;
        if (colorVariant.reserved < 0) colorVariant.reserved = 0;
    }

    cart.items.splice(itemIndex, 1);

    await product.save();
    await cart.save();

    res.status(200).json({ msg: "success", cart });
});
