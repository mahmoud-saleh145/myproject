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

    let wishlist
    if (userId) {
        wishlist = await wishListModel
            .findOne({ userId })
            .populate("items.productId");
    } else if (sessionId) {
        wishlist = await wishListModel
            .findOne({ sessionId })
            .populate("items.productId");
    }


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


    let wishlist
    if (userId) {
        wishlist = await wishListModel
            .findOne({ userId })
            .populate("items.productId");
    } else if (sessionId) {
        wishlist = await wishListModel
            .findOne({ sessionId })
            .populate("items.productId");
    }

    if (!wishlist) {
        wishlist = new wishListModel({
            sessionId: sessionId || undefined,
            userId: userId || null,
            items: [],
        });
    }

    const itemIndex = wishlist.items.findIndex(item => {
        const idInWishlist =
            typeof item.productId === "string"
                ? item.productId
                : item.productId?._id;

        return idInWishlist?.toString() === productId.toString();
    });

    let msg;
    let added;

    if (itemIndex === -1) {
        wishlist.items.push({ productId });
        msg = "Item added to wishlist";
        added = true;
    } else {
        wishlist.items.splice(itemIndex, 1);
        msg = "Item removed from wishlist";
        added = false;
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

    let wishlist
    if (userId) {
        wishlist = await wishListModel
            .findOne({ userId })
            .populate("items.productId");
    } else if (sessionId) {
        wishlist = await wishListModel
            .findOne({ sessionId })
            .populate("items.productId");
    }

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




