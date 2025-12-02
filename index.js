import express from 'express';
import connectionDB from './db/connectionDB.js';
import productRouter from './src/modules/product/product.routes.js';
import userRouter from './src/modules/user/user.routes.js';
import cartRouter from './src/modules/cart/cart.routes.js';
import wishListRouter from './src/modules/wishList/wishList.routes.js';
import orderRouter from './src/modules/order/order.routes.js';
import cookieParser from "cookie-parser";
import { attachSession } from "./src/middleware/session.middleware.js";
import { AppError } from './src/utils/classError.js';
import cors from "cors";
import { protectRoute } from './src/middleware/logedInUser.middleware.js';
import sessionRouter from "./src/modules/session/session.routes.js";
import dotenv from "dotenv";
dotenv.config();

const port = process.env.PORT || 3001;
const app = express();

connectionDB()

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: [
        "http://localhost:3000",
        "https://myproject-zeta-two.vercel.app"
    ],
    credentials: true,
}));

app.use(protectRoute);
app.use(attachSession);


app.get("/", (req, res) => {
    res.json({ msg: "Hello" })
})

app.use("/session", sessionRouter);
app.use("/product", productRouter)
app.use("/user", userRouter)
app.use("/cart", cartRouter)
app.use("/wishlist", wishListRouter)
app.use("/order", orderRouter)


app.use((req, res, next) => {
    next(new AppError(`URL not found ${req.originalUrl}`, 404));
})


app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({ msg: "error", err: err.message });
})


app.listen(port, () => { console.log(`Example app listening at http://localhost:${port}`) })