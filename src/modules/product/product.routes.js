import { Router } from "express";
import * as PC from "./product.controller.js";
import { multerStorageLocal, multerStorageOnline } from "../../serves/multer.js";

const router = Router();

const upload = process.env.NODE_ENV === "production" ? multerStorageOnline() : multerStorageLocal();


router.get('/', PC.getProducts)
router.get('/getBrand', PC.getBrand)
router.get('/getAllBrands', PC.getAllBrands)
router.get('/getCategory', PC.getCategory)
router.get('/getAllCategories', PC.getAllCategories)

router.post('/addProduct', upload.any(), PC.addProduct)

router.patch('/updateProduct', upload.any(), PC.updateProduct)
router.patch('/updateManyProductBrand', PC.updateManyProductBrand)
router.patch('/updateManyProductCategory', PC.updateManyProductCategory)

router.delete('/deleteProduct', PC.deleteProduct)


export default router;