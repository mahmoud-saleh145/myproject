import { Router } from "express";
import * as WC from './wishList.controller.js';
const router = Router();

router.get('/', WC.getWishlist)
router.post('/addToWishList', WC.addToWishList)




export default router;