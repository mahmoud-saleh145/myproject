import { Schema, model } from "mongoose";

const productSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    reserved: {
        type: Number,
        default: 0
    },
    image: [
        {
            _id: false,
            url: {
                type: String,
                required: true,
                trim: true
            },
        }
    ],
    color: [
        {
            type: String,
            _id: false,
        }
    ],

    brand: {
        type: String,
        trim: true
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
    },
    raise: {
        type: Number,
        default: 0,

    },
    hide: {
        type: Boolean,
        default: false
    }
    ,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
})

const productModel = model('product', productSchema);

export default productModel;