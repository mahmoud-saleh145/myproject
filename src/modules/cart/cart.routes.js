import { Router } from "express";
import * as UC from "./cart.controller.js";

const router = Router();

router.get('/', UC.getCarts)

router.get("/getCart", UC.getCart);
router.get("/getCartQuantity", UC.getCartQuantity);

router.post("/addToCart", UC.addToCart);

router.patch("/addQuantity", UC.addQuantity);
router.patch("/reduceQuantity", UC.reduceQuantity);
router.patch("/emptyCart", UC.emptyCart);
router.patch("/removeProduct", UC.removeProduct);


export default router;