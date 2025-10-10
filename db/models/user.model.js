import { Schema, model } from "mongoose";

const userSchema = new Schema({
    sessionId: {
        type: String
    },
    email: {
        type: String,
        unique: true
    },
    firstName: {
        type: String,
        default: "",
        trim: true
    },
    lastName: {
        type: String,
        default: "",
        trim: true
    },
    address: {
        type: String,
        default: "",
        trim: true
    },
    phone: {
        type: String,
        default: "",
        trim: true
    },
    city: {
        type: String,
        default: "",
        trim: true
    },
    governorate: {
        type: String,
        default: "",
        trim: true
    },
    orders: [{
        _id: false,
        orderId: {
            type: Schema.Types.ObjectId,
            ref: "order",
            trim: true
        }
    }]


}, {
    timestamps: true
})

const userModel = model('user', userSchema);

export default userModel;