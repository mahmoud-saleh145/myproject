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
    const { productId, quantity = 1, color } = req.body;

    if (!sessionId && !userId) {
        return next(new AppError("Session or user not found", 400));
    }

    const product = await productModel.findById(productId);
    if (!product) return next(new AppError("Product not found", 404));


    const colorVariant = product.colors.find(c => c.color === color);
    if (!colorVariant)
        return next(new AppError("Selected color not found for this product", 400));

    const available = colorVariant.stock - colorVariant.reserved;
    if (available < quantity)
        return next(new AppError("Not enough stock for this color", 400));

    let cart = userId
        ? await cartModel.findOne({ userId })
        : await cartModel.findOne({ sessionId });

    if (!cart) {
        cart = new cartModel({
            userId: userId || undefined,
            sessionId: sessionId || undefined,
            items: [],
        });
    }


    const itemIndex = cart.items.findIndex(
        item =>
            item.productId.toString() === productId.toString() &&
            item.color === color
    );

    if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
    } else {
        cart.items.push({ productId, quantity, color });
    }


    colorVariant.reserved += quantity;

    await cart.save();
    await product.save();

    res.json({ message: "Item added to cart", cart });
});

export const getCart = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const sessionId = req.cookies.sessionId;
    const userId = req.user?._id;
    if (!sessionId && !userId)
        return next(new AppError("Session or user not found", 400));

    let cart = await cartModel
        .findOne({
            $or: [{ userId }, { sessionId }],
        })
        .populate("items.productId");

    if (!cart && sessionId) {
        cart = await cartModel.create({ sessionId, items: [] });
    }

    res.json(cart || { items: [] });
});

export const mergeCart = asyncHandler(async (req, res, next) => {
    await connectToDB();

    const sessionId = req.cookies?.sessionId;
    const userId = req.user?._id;

    if (!sessionId || !userId) {
        return next(new AppError("Session ID and User ID are required", 400));
    }

    const sessionCart = await cartModel.findOne({ sessionId }).populate("items.productId");
    const userCart = await cartModel.findOne({ userId }).populate("items.productId");

    if (!sessionCart && !userCart) {
        return res.status(200).json({ msg: "No carts to merge", cart: [] });
    }

    if (sessionCart && sessionCart.items.length === 0) {
        sessionCart.userId = userId;
        sessionCart.sessionId = null;
        await sessionCart.save();
        return res.status(200).json({
            msg: "Session cart was empty, assigned to user",
            cart: sessionCart.items,
        });
    }


    if (!userCart) {
        sessionCart.userId = userId;
        sessionCart.sessionId = null;
        await sessionCart.save();
        return res.status(200).json({
            msg: "Cart merged successfully (session cart assigned to user)",
            cart: sessionCart.items,
        });
    }


    for (const item of sessionCart.items) {
        const { productId, quantity, color } = item;

        const existingItem = userCart.items.find(
            (i) =>
                i.productId.toString() === productId._id.toString() &&
                i.color === color
        );

        const product = await productModel.findById(productId);
        if (!product || product.stock < quantity) continue;

        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            existingItem.quantity = Math.min(newQuantity, product.stock);
        } else {
            userCart.items.push({
                productId: productId._id,
                quantity: Math.min(quantity, product.stock),
                color
            });
        }

        await productModel.findByIdAndUpdate(productId, {
            $inc: { reserved: -quantity }
        });
    }

    await userCart.save();
    await sessionCart.deleteOne();

    res.status(200).json({
        msg: "Cart merged successfully",
        cart: userCart.items,
    });
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

    // 🔍 نجيب الـ item بالمنتج واللون (لو موجود في البودي أو من الكارت)
    let itemIndex = cart.items.findIndex(
        item =>
            item.productId.toString() === productId.toString() &&
            (!color || item.color === color)
    );

    if (itemIndex === -1)
        return next(new AppError("Item not found in cart", 404));

    const itemColor = color || cart.items[itemIndex].color;
    const colorVariant = product.colors.find(c => c.color === itemColor);
    if (!colorVariant)
        return next(new AppError("Selected color not found", 400));

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        cart.items[itemIndex].quantity -= 1;
        colorVariant.reserved = Math.max(0, colorVariant.reserved - 1);
        if (cart.items[itemIndex].quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        }
        await product.save({ session });
        await cart.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ msg: "success", cart });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return next(error);
    }
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
        item =>
            item.productId.toString() === productId.toString() &&
            (!color || item.color === color)
    );

    if (itemIndex === -1)
        return next(new AppError("Item not found in cart", 404));

    // ✅ نحدد اللون الصحيح
    const itemColor = color || cart.items[itemIndex].color;
    const colorVariant = product.colors.find(c => c.color === itemColor);

    if (!colorVariant)
        return next(new AppError("Selected color not found", 400));

    // 🧾 نبدأ transaction علشان الاتنين يتحفظوا مع بعض
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // قلل الكمية في الكارت
        cart.items[itemIndex].quantity -= 1;

        // وقلل reserved لكن متخلوش أقل من 0
        colorVariant.reserved = Math.max(0, colorVariant.reserved - 1);

        // لو الكمية بقت صفر أو أقل نحذف العنصر
        if (cart.items[itemIndex].quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        }

        await product.save({ session });
        await cart.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ msg: "success", cart });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return next(error);
    }
});


export const emptyCart = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const userId = req.user?._id;
    const sessionId = req.cookies.sessionId;

    if (!sessionId && !userId)
        return next(new AppError("Session or user not found", 400));

    let cart = userId
        ? await cartModel.findOne({ userId })
        : await cartModel.findOne({ sessionId });

    if (!cart) return next(new AppError("Cart not found", 404));

    for (const item of cart.items) {
        const product = await productModel.findById(item.productId);
        if (!product) continue;

        const colorVariant = product.colors.find(c => c.color === item.color);
        if (colorVariant) {
            colorVariant.reserved -= item.quantity;
            if (colorVariant.reserved < 0) colorVariant.reserved = 0;
            await product.save();
        }
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({ msg: "success", message: "Cart emptied", cart });
});

export const removeProduct = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const { productId, color } = req.body;
    const userId = req.user?._id;
    const sessionId = req.cookies.sessionId;

    if (!sessionId && !userId)
        return next(new AppError("Session or user not found", 400));

    let cart = userId
        ? await cartModel.findOne({ userId })
        : await cartModel.findOne({ sessionId });

    if (!cart) return next(new AppError("Cart not found", 404));

    const product = await productModel.findById(productId);
    if (!product) return next(new AppError("Product not found", 404));

    const itemIndex = cart.items.findIndex(
        item =>
            item.productId.toString() === productId.toString() &&
            item.color === color
    );

    if (itemIndex === -1)
        return next(new AppError("Item not found in cart", 404));

    const item = cart.items[itemIndex];
    const colorVariant = product.colors.find(c => c.color === color);
    if (colorVariant) {
        colorVariant.reserved -= item.quantity;
        if (colorVariant.reserved < 0) colorVariant.reserved = 0;
    }

    cart.items.splice(itemIndex, 1);

    await product.save();
    await cart.save();

    res.status(200).json({ msg: "success", message: "Product removed", cart });
});
