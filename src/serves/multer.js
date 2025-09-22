import multer from "multer"
import { nanoid } from "nanoid";
import path from "path"


export const multerStorage = () => {



    const storage = multer.diskStorage({

        destination: function (req, file, cb) {
            const allPath = path.resolve('uploads')
            cb(null, allPath)
        }, filename: function (req, file, cb) {
            cb(null, nanoid(5) + file.originalname)
        }
    })

    const upload = multer({ storage })
    return upload
}



