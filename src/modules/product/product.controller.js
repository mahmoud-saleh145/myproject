import connectToDB from '../../../db/connectionDB.js';
import { AppError } from '../../utils/classError.js';
import cloudinary from '../../utils/cloudinary.js';
import { asyncHandler } from '../../utils/globalErrorHandling.js';
import productModel from './../../../db/models/product.model.js';
import fs from "fs";

export const getProducts = asyncHandler(async (req, res, next) => {
    await connectToDB();
    let page = Math.max(parseInt(req.query?.page) || 1, 1);
    let limit = Math.max(parseInt(req.query?.limit) || 10, 1);
    let skip = (page - 1) * limit;
    let query = {};


    if (req.query.category) query.category = { $regex: req.query.category, $options: "i" };
    if (req.query.brand) query.brand = { $regex: req.query.brand, $options: "i" };

    if (req.query?.search) {
        const search = req.query.search;
        query = {
            $or: [
                { name: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
                { brand: { $regex: search, $options: "i" } },
            ]
        };
    }

    if (req.query.minPrice || req.query.maxPrice) {
        query.price = {};
        if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
        if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
    }


    let sort = {};
    switch (req.query.sort) {
        case "price_asc":
            sort.price = 1;
            break;
        case "price_desc":
            sort.price = -1;
            break;
        case "newest":
            sort.createdAt = -1;
            break;
        default:
            sort = {};
    }
    const total = await productModel.countDocuments(query);

    const products = await productModel.find(query).sort(sort).skip(skip).limit(limit);
    if (!products) {
        res.status(202).json({ msg: "empty" })
    }

    res.status(200).json({
        msg: "success",
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        products
    });
});

export const getProductDetails = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const { id } = req.query;
    const product = await productModel.findById(id);
    if (!product) {
        return next(new AppError("Product not found", 404));
    }
    res.status(200).json({ msg: "success", product });
})

const uploadToCloudinary = async (file) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'products' },
            (error, result) => {
                if (result) resolve(result);
                else reject(error);
            }
        );
        if (file.buffer) stream.end(file.buffer);
        else stream.end(fs.readFileSync(file.path));
    });
};

export const addProduct = asyncHandler(async (req, res, next) => {
    await connectToDB();

    const {
        name,
        price,
        description,
        category,
        brand,
        discount,
        variantsMeta
    } = req.body;

    if (!name || !price || !description || !category || !variantsMeta || !brand) {
        return next(new AppError("Please provide all required fields", 400));
    }

    if (!req.files || req.files.length === 0) {
        return next(new AppError("Please upload at least one image", 400));
    }

    // Parse variants metadata
    let parsedVariants;
    try {
        parsedVariants = typeof variantsMeta === "string" ? JSON.parse(variantsMeta) : variantsMeta;
    } catch {
        return next(new AppError("Invalid variants format", 400));
    }


    // Upload images
    const uploadResults = await Promise.all(req.files.map(file => uploadToCloudinary(file)));

    // Build variants
    const finalVariants = parsedVariants.map(v => {
        const images = (v.fileIndexes || []).map(idx => ({
            url: uploadResults[idx]?.secure_url
        }));

        return {
            color: v.color,
            stock: v.stock || 0,
            reserved: 0,
            images
        };
    });

    const product = new productModel({
        name,
        price,
        description,
        category,
        brand,
        discount,
        raise: 20,
        hide: false,
        variants: finalVariants
    });

    await product.save();

    res.status(201).json({ msg: "success", product });
});


export const updateProduct = asyncHandler(async (req, res, next) => {
    await connectToDB();
    let {
        id,
        name,
        price,
        description,
        category,
        brand,
        discount,
        raise,
        hide,
        variantsMeta
    } = req.body;

    hide = hide === "true";

    // Parse variantsMeta
    let parsedVariants;
    try {
        parsedVariants = typeof variantsMeta === "string" ? JSON.parse(variantsMeta) : variantsMeta;
    } catch {
        return next(new AppError("Invalid variantsMeta JSON", 400));
    }

    // Upload new images
    let uploadResults = [];
    if (req.files?.length > 0) {
        uploadResults = await Promise.all(req.files.map(f => uploadToCloudinary(f)));
    }

    // Fetch old product
    const product = await productModel.findById(id);
    if (!product) return next(new AppError("Product not found", 404));

    // Build new variants
    const updatedVariants = parsedVariants.map(v => {
        const oldVariant = product.variants.find(x => x.color === v.color);

        // Collect old images to keep
        const oldImages = (v.keepOldImages || []).map(url => ({ url }));

        // Collect new uploaded images
        const newImages = (v.fileIndexes || []).map(idx => ({
            url: uploadResults[idx]?.secure_url
        }));

        return {
            color: v.color,
            stock: v.stock ?? oldVariant?.stock ?? 0,
            reserved: oldVariant?.reserved ?? 0,
            images: [...oldImages, ...newImages]
        };
    });

    // Update product fields
    product.name = name;
    product.price = price;
    product.description = description;
    product.category = category;
    product.brand = brand;
    product.discount = discount;
    product.raise = raise;
    product.hide = hide;
    product.variants = updatedVariants;

    await product.save();

    res.status(200).json({ msg: "success", product });
});


export const updateManyProductBrand = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const { brand, raise, discount } = req.body;
    const products = await productModel.updateMany({ brand }, { raise, discount });
    if (products.matchedCount === 0) {
        return next(new AppError("No products found for this brand", 404));
    } else {
        res.status(200).json({ msg: "success", products });
    }
})

export const updateManyProductCategory = asyncHandler(async (req, res, next) => {
    await connectToDB();
    const { category, raise, discount } = req.body;
    const products = await productModel.updateMany({ category }, { raise, discount });

    if (products.matchedCount === 0) {
        return next(new AppError("No products found for this category", 404));
    } else {
        res.status(200).json({ msg: "success", products });
    }
})

export const getBrand = asyncHandler(async (req, res, next) => {
    await connectToDB();

    const { brand } = req.query;
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
    await connectToDB();
    const { category } = req.query;
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
    await connectToDB();
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
    await connectToDB();
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
    await connectToDB();
    const { id } = req.body;
    const product = await productModel.deleteOne({ _id: id });
    res.status(200).json({ msg: "success", product });
})

