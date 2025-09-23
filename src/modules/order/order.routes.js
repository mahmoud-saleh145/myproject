import { Router } from "express";
import * as OC from "./order.controller.js";

const router = Router();

router.get('/', OC.getOrders);
router.post('/createOrder', OC.createOrder);
router.get('/getOrderByRandomId', OC.getOrderByRandomId);


export default router;