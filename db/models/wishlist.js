import { Schema, model } from "mongoose";

const wishListSchema = new Schema({
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
            },
        }]
}, {
    timestamps: true
})

const wishListModel = model('wishList', wishListSchema);

export default wishListModel;