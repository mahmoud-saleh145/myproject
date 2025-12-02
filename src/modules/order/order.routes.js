import { Router } from "express";
import * as OC from "./order.controller.js";

const router = Router();

router.post('/', OC.getOrders);
router.post('/createOrder', OC.createOrder);
router.patch('/updateOrder/:id', OC.updateOrder);


export default router;