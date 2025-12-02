import { Router } from "express";
import * as UC from "./user.controller.js";

const router = Router();

router.get('/', UC.getUsers)
router.get('/getUserInfo', UC.getUserInfo)
router.post('/authUser', UC.authUser)
router.patch('/updateUser', UC.updateUser)




export default router;