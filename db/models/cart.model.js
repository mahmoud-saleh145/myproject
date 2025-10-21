import { Schema, model } from "mongoose";

const cartSchema = new Schema({
    sessionId: {
        type: String
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        default: null
    },
    items: [
        {
            _id: false,
            productId: {
                type: Schema.Types.ObjectId,
                ref: 'product',
                required: true,
            },
            quantity: {
                type: Number,
                default: 1,
                min: 0
            },
            color: {
                type: String,
                required: true,
                trim: true,
            }
        }
    ]
}, {
    timestamps: true
})

const cartModel = model('cart', cartSchema);

export default cartModel;