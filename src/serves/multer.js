import multer from "multer"
import { nanoid } from "nanoid";
import path from "path"


export const multerStorage = () => {



    const storage = multer.diskStorage({})



    const upload = multer({ storage })
    return upload
}



