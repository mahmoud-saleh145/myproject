import { Router } from "express";
import * as OC from "./order.controller.js";

const router = Router();

router.post('/createOrder', OC.createOrder);


export default router;