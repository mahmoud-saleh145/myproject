import connectToDB from '../../../db/connectionDB.js';
import productModel from '../../../db/models/product.model.js';
import { AppError } from '../../utils/classError.js';
import { asyncHandler } from '../../utils/globalErrorHandling.js';
import userModel from './../../../db/models/user.model.js';


export const getWishlist = asyncHandler(async (req, res, next) => {
    await connectToDB();

    const sessionId = req.cookies.sessionId;
    const userId = req.body.userId;

    let user;

    if (userId) {
        user = await userModel.findById(userId).populate("wishList.product");
        if (!user) return next(new AppError("No user found with this ID", 404));
    } else if (sessionId) {
        user = await userModel.findOne({ sessionId }).populate("wishList.product");
        if (!user) {
            // لو الزائر لسه جديد، نرجع ليست فاضية
            return res.status(200).json({ msg: "success", wishList: [] });
        }
    } else {
        return next(new AppError("No user or session found", 400));
    }

    res.status(200).json({
        msg: "success",
        wishList: user.wishList || [],
    });
});

export const toggleWishList = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const sessionId = req.cookies.sessionId;
    const userId = req.body.userId;
    const { productId } = req.body;

    if (!productId) return next(new AppError("Please provide productId", 400));

    const product = await productModel.findById(productId);
    if (!product) return next(new AppError("No product found with this ID", 404));

    let user;

    if (userId) {
        user = await userModel.findById(userId);
        if (!user) return next(new AppError("User not found", 404));
    } else {
        // لو شغال بسيشن
        user = await userModel.findOne({ sessionId });
        if (!user) {
            user = new userModel({ sessionId, wishList: [] });
        }
    }

    if (!Array.isArray(user.wishList)) {
        user.wishList = [];
    }

    const itemIndex = user.wishList.findIndex(
        (item) => item.product.toString() === productId.toString()
    );

    let msg;
    let added;

    if (itemIndex > -1) {
        // المنتج موجود ⇒ احذفه
        user.wishList.splice(itemIndex, 1);
        msg = "Item removed from wishlist";
        added = false;
    } else {
        // المنتج مش موجود ⇒ ضيفه
        user.wishList.push({ product: productId });
        msg = "Item added to wishlist";
        added = true;
    }

    await user.save();

    res.status(200).json({
        msg,
        added, // ← دي أهم حاجة للفرونت
        wishList: user.wishList,
    });
});



export const emptyWishList = asyncHandler(async (req, res, next) => {
    await connectToDB();

    const sessionId = req.cookies.sessionId;
    const userId = req.body.userId;

    if (!userId && !sessionId) {
        return next(new AppError("User ID or session ID is required", 400));
    }

    let user;

    if (userId) {
        user = await userModel.findByIdAndUpdate(
            userId,
            { $set: { wishList: [] } },
            { new: true }
        );
    } else {
        user = await userModel.findOneAndUpdate(
            { sessionId },
            { $set: { wishList: [] } },
            { new: true }
        );
    }

    if (!user) {
        return next(new AppError("User not found", 404));
    }

    res.status(200).json({ msg: "success", wishList: user.wishList });
});
