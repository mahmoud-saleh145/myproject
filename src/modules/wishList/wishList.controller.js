import productModel from '../../../db/models/product.model.js';
import { AppError } from '../../utils/classError.js';
import { asyncHandler } from '../../utils/globalErrorHandling.js';
import userModel from './../../../db/models/user.model.js';


export const getWishlist = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    if (!email) {
        return next(new AppError("please provide email", 404));
    }
    const user = await userModel.findOne({ email: email }).populate("wishList.product");
    if (!user) {
        return next(new AppError("No user found with this email", 404));
    }
    res.status(200).json({ msg: "success", wishList: user.wishList });
});

export const addToWishList = asyncHandler(async (req, res, next) => {
    const { productID, email } = req.body;

    if (!productID) {
        return next(new AppError("Please provide productID", 400));
    }
    if (!email) {
        return next(new AppError("please provide email", 404));
    }

    const [product, user] = await Promise.all([
        productModel.findById(productID),
        userModel.findOne({ email })
    ]);

    if (!product) {
        return next(new AppError("No product found with this ID", 400));
    }

    if (!user) {
        return next(new AppError("No user found with this email", 400));
    }

    const alreadyInWishList = user.wishList.find(
        item => item.product.toString() === productID
    );

    if (alreadyInWishList) {
        return next(new AppError("Product already in wishlist", 400));
    }

    const updatedUser = await userModel.findOneAndUpdate(
        { email },
        { $addToSet: { wishList: { product: productID } } },
        { new: true }
    ).populate("wishList.product");

    await user.save();
    res.status(201).json({ msg: "success", wishList: updatedUser.wishList });
})

export const removeFromWishList = asyncHandler(async (req, res, next) => {
    const { productID, email } = req.body;

    if (!productID) {
        return next(new AppError("Please provide productID", 400));
    }
    if (!email) {
        return next(new AppError("Please provide email", 400));
    }

    const [product, user] = await Promise.all([
        productModel.findById(productID),
        userModel.findOne({ email })
    ]);

    if (!product) {
        return next(new AppError("No product found with this ID", 404));
    }
    if (!user) {
        return next(new AppError("No user found with this email", 404));
    }

    const itemIndex = user.wishList.findIndex(
        (item) => item.product.toString() === productID.toString()
    );

    if (itemIndex === -1) {
        return next(new AppError("Item not found in wishlist", 400));
    }

    const updatedUser = await userModel
        .findOneAndUpdate(
            { email },
            { $pull: { wishList: { product: productID } } },
            { new: true }
        )
        .populate("wishList.product", "name price image");

    res.status(200).json({ msg: "success", wishList: updatedUser.wishList });
});

export const emptyWishList = asyncHandler(async (req, res, next) => {

    const { email } = req.body;
    if (!email) {
        return next(new AppError("please provide email", 400));
    }
    const user = await userModel.findOneAndUpdate(
        { email },
        { $set: { wishList: [] } },
        { new: true }
    )

    if (!user) {
        return next(new AppError("No user found with this email", 400));
    }


    user.wishList = [];
    await user.save();
    res.status(200).json({ msg: "success", wishList: user.wishList });
})