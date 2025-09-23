import connectToDB from '../../../db/connectionDB.js';
import { AppError } from '../../utils/classError.js';
import cloudinary from '../../utils/cloudinary.js';
import { asyncHandler } from '../../utils/globalErrorHandling.js';
import productModel from './../../../db/models/product.model.js';
import fs from "fs";

export const getProducts = asyncHandler(async (req, res, next) => {
    let page = Math.max(parseInt(req.body?.page) || 1, 1);
    let limit = Math.max(parseInt(req.body?.limit) || 10, 1);
    let skip = (page - 1) * limit;
    // Search / Filter
    let query = {};
    if (req.body.search) {
        const search = req.body.search;
        query = {
            $or: [
                { name: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
                { brand: { $regex: search, $options: "i" } },
            ]
        };
    }
    // Count total matching documents
    const total = await productModel.countDocuments(query);
    // Get products with pagination
    const products = await productModel.find(query).skip(skip).limit(limit);
    res.status(200).json({
        msg: "success",
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        products
    });
});


export const addProduct = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const { name, price, description, category, stock, brand, discount } = req.body;
    if (!name || !price || !description || !category || !stock) {
        return next(new AppError("Please provide all required fields", 400));
    }

    if (!req.files || req.files.length === 0) {
        return next(new AppError("Please upload at least one image", 400));
    }

    let images = [];
    for (const file of req.files) {
        const uploadResult = await cloudinary.uploader.upload(file.path, { folder: "products" });
        images.push({ original: uploadResult.secure_url });

        fs.unlinkSync(file.path);
    }

    const product = new productModel({ name, price, description, category, stock, image: images, brand, discount, raise: 0, hide: false });
    await product.save();
    res.status(201).json({ msg: "success", product });
})



export const updateProduct = asyncHandler(async (req, res, next) => {
    const { id, name, price, description, category, stock, brand, discount, raise, hide } = req.body;

    let images = [];
    if (req.files && req.files.length > 0) {
        for (const file of req.files) {
            const uploadResult = await cloudinary.uploader.upload(file.path, { folder: "products" });
            images.push({ original: uploadResult.secure_url });
        }
    }

    const updateData = { name, price, description, category, stock, brand, discount, raise, hide };
    if (images.length > 0) updateData.image = images;

    const product = await productModel.updateOne({ _id: id }, updateData);

    res.status(200).json({ msg: "success", product });
});


export const updateManyProductBrand = asyncHandler(async (req, res, next) => {
    const { brand, raise, discount } = req.body;
    const products = await productModel.updateMany({ brand }, { raise, discount });
    if (products.matchedCount === 0) {
        return next(new AppError("No products found for this brand", 404));
    } else {
        res.status(200).json({ msg: "success", products });
    }
})

export const updateManyProductCategory = asyncHandler(async (req, res, next) => {
    const { category, raise, discount } = req.body;
    const products = await productModel.updateMany({ category }, { raise, discount });

    if (products.matchedCount === 0) {
        return next(new AppError("No products found for this category", 404));
    } else {
        res.status(200).json({ msg: "success", products });
    }
})

export const getBrand = asyncHandler(async (req, res, next) => {

    const { brand } = req.body;
    if (!brand) {
        return next(new AppError("Please provide a brand name", 400));
    }

    const products = await productModel.find({
        brand: { $regex: brand, $options: "i" },
    });
    if (products.length === 0) {
        return next(new AppError("No products found for this brand", 404));
    } else {
        res.status(200).json({ msg: "success", products });
    }
})

export const getCategory = asyncHandler(async (req, res, next) => {

    const { category } = req.body;
    if (!category) {
        return next(new AppError("Please provide a category name", 400));
    }

    const products = await productModel.find({
        category: { $regex: category, $options: "i" },
    });
    if (products.length === 0) {
        return next(new AppError("No products found for this category", 404));
    } else {
        res.status(200).json({ msg: "success", products });
    }

})

export const getAllCategories = asyncHandler(async (req, res, next) => {
    const categories = await productModel.aggregate([
        {
            $group: {
                _id: "$category",
                count: { $sum: 1 }
            },
        },
        {
            $project: {
                _id: 0,
                category: "$_id",
                count: 1
            }
        },
        { $sort: { count: -1 } }
    ]);

    if (!categories || categories.length === 0) {
        return next(new AppError("No categories found", 404));
    }

    res.status(200).json({
        msg: "success",
        categories
    });
});


export const getAllBrands = asyncHandler(async (req, res, next) => {
    const brands = await productModel.aggregate([
        {
            $group: {
                _id: "$brand",
                count: { $sum: 1 }
            },
        },
        {
            $project: {
                _id: 0,
                brand: "$_id",
                count: 1
            }
        },
        { $sort: { count: -1 } }
    ]);

    if (!brands || brands.length === 0) {
        return next(new AppError("No brands found", 404));
    }

    res.status(200).json({
        msg: "success",
        brands
    });
});


export const deleteProduct = (async (req, res, next) => {
    const { id } = req.body;
    const product = await productModel.deleteOne({ _id: id });
    res.status(200).json({ msg: "success", product });
})


