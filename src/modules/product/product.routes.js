import { Router } from "express";
import * as PC from "./product.controller.js";
import { multerStorage } from "../../serves/multer.js";

const router = Router();

router.get('/', PC.getProducts)
router.get('/getBrand', PC.getBrand)
router.get('/getAllBrands', PC.getAllBrands)
router.get('/getCategory', PC.getCategory)
router.get('/getAllCategories', PC.getAllCategories)

router.post('/addProduct', multerStorage().any(), PC.addProduct)

router.patch('/updateProduct', multerStorage().any(), PC.updateProduct)
router.patch('/updateManyProductBrand', PC.updateManyProductBrand)
router.patch('/updateManyProductCategory', PC.updateManyProductCategory)

router.delete('/deleteProduct', PC.deleteProduct)


export default router;