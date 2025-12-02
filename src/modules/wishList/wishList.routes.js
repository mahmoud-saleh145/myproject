import { Router } from "express";
import * as WC from './wishList.controller.js';
const router = Router();

router.get('/', WC.getWishlist)
router.post('/toggleWishList', WC.toggleWishList)
router.patch('/emptyWishList', WC.emptyWishList)
export default router;