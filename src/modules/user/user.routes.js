import { Router } from "express";
import * as UC from "./user.controller.js";

const router = Router();

router.get('/', UC.getUsers)
router.post('/addUser', UC.addUser)
router.post('/getUserInfo', UC.getUserInfo)



export default router;