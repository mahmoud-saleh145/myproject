import connectToDB from '../../../db/connectionDB.js';
import productModel from '../../../db/models/product.model.js';
import wishListModel from '../../../db/models/wishlist.js';
import { AppError } from '../../utils/classError.js';
import { asyncHandler } from '../../utils/globalErrorHandling.js';


export const getWishlist = asyncHandler(async (req, res, next) => {
    await connectToDB();

    const sessionId = req.cookies?.sessionId;
    const userId = req.user?._id;
    if (!sessionId && !userId)
        return next(new AppError("Session or user not found", 400));
    let wishlist = await wishListModel
        .findOne({
            $or: [{ userId }, { sessionId }],
        })
        .populate("items.productId");

    if (!wishlist) {
        return res.status(200).json({
            msg: "success",
            wishList: [],
        });
    }

    res.status(200).json({
        msg: "success",
        wishList: wishlist,
    });
});



export const toggleWishList = asyncHandler(async (req, res, next) => {
    await connectToDB();

    const sessionId = req.cookies?.sessionId;
    const userId = req.user?._id;
    const { productId } = req.body;

    if (!sessionId && !userId)
        return next(new AppError("Session or user not found", 400));
    if (!productId)
        return next(new AppError("Please provide productId", 400));

    const product = await productModel.findById(productId);
    if (!product)
        return next(new AppError("No product found with this ID", 404));


    let wishlist = await wishListModel.findOne({
        $or: [{ userId }, { sessionId }],
    });

    if (!wishlist) {
        wishlist = new wishListModel({
            sessionId: sessionId || undefined,
            userId: userId || null,
            items: [],
        });
    }

    const itemIndex = wishlist.items.findIndex(
        (item) => item.productId.toString() === productId.toString()
    );

    let msg;
    let added;

    if (itemIndex > -1) {
        wishlist.items.splice(itemIndex, 1);
        msg = "Item removed from wishlist";
        added = false;
    } else {
        wishlist.items.push({ productId });
        msg = "Item added to wishlist";
        added = true;
    }

    await wishlist.save();

    res.status(200).json({
        msg,
        added,
        wishList: wishlist,
    });
});


export const emptyWishList = asyncHandler(async (req, res, next) => {
    await connectToDB();

    const sessionId = req.cookies?.sessionId;
    const userId = req.user?._id;

    if (!userId && !sessionId) {
        return next(new AppError("User ID or session ID is required", 400));
    }

    const wishlist = await wishListModel.findOne({
        $or: [{ userId }, { sessionId }],
    });

    if (!wishlist) {
        return res.status(200).json({ msg: "success", wishList: [] });
    }

    if (wishlist.items.length === 0)
        return res.status(200).json({ msg: "Already empty", wishList: [] });

    wishlist.items = [];
    await wishlist.save();

    res.status(200).json({
        msg: "success",
        wishList: [],
    });
});



export const mergeWishLists = asyncHandler(async (req, res, next) => {
    await connectToDB();

    const sessionId = req.cookies?.sessionId;
    const userId = req.user?._id;
    if (!sessionId && !userId)
        return next(new AppError("Session or user not found", 400));
    if (!sessionId || !userId) {
        return next(new AppError("Session ID and User ID are required", 400));
    }

    const sessionWishlist = await wishListModel.findOne({ sessionId });
    let userWishlist = await wishListModel.findOne({ userId });

    if (!sessionWishlist && !userWishlist) {
        return res.status(200).json({
            msg: "No wishlists to merge",
            wishList: [],
        });
    }

    if (sessionWishlist && sessionWishlist.items.length === 0) {
        await sessionWishlist.deleteOne();
        return res.status(200).json({
            msg: "Session wishlist was empty",
            wishList: userWishlist?.items || [],
        });
    }

    if (!userWishlist) {
        userWishlist = new wishListModel({
            userId,
            items: sessionWishlist?.items || [],
        });
    } else if (sessionWishlist) {
        const existingIds = new Set(
            userWishlist.items.map((item) => item.productId.toString())
        );

        sessionWishlist.items.forEach((item) => {
            if (!existingIds.has(item.productId.toString())) {
                userWishlist.items.push({ productId: item.productId });
            }
        });
    }

    await userWishlist.save();

    if (sessionWishlist) {
        await sessionWishlist.deleteOne();
    }

    res.status(200).json({
        msg: "Wishlist merged successfully",
        wishList: userWishlist.items,
    });
});


