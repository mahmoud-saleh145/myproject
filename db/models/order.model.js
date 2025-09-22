import { Schema, model } from "mongoose";

const orderSchema = new Schema({
    sessionId: {
        type: String
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        default: null
    },
    products: [
        {
            _id: false,
            productId: {
                type: Schema.Types.ObjectId,
                ref: 'product',
                required: true
            },
            quantity: {
                type: Number,
                default: 1,
                min: 0
            },
            price: {
                type: Number,
            }
        }
    ],
    shippingCost: {
        type: Number,
        default: 0
    },
    subtotal: {
        type: Number,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["placed", "shipping", "delivered"],
        default: "placed"
    },

    email: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
        default: "",
        trim: true,
        required: true
    },
    lastName: {
        type: String,
        default: "",
        trim: true,
        required: true
    },
    address: {
        type: String,
        default: "",
        trim: true,
        required: true
    },
    phone: {
        type: String,
        default: "",
        trim: true,
        required: true
    },
    city: {
        type: String,
        default: "",
        trim: true,
        required: true
    },
    governorate: {
        type: String,
        default: "",
        trim: true,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ["cash", "credit_card", "instaPay", "vodafoneCash"],
        default: "cash"
    },
    orderNumber: {
        type: Number,
        required: true,
        unique: true
    },
    randomId: {
        type: String,
        required: true
    }

}, {
    timestamps: true
})

const orderModel = model('order', orderSchema);

export default orderModel;