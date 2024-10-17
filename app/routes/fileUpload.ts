import multer from 'multer' ;
import cloudinary from 'cloudinary'
import createHttpError from "http-errors";
import express from "express";
import expressAsyncHandler from "express-async-handler";
import { createResponse } from "../helper/response";
import { catchError, validate } from "../middleware/validation";
import fs from 'fs' ;
import { authMiddleware } from '../middleware/auth';
import path from "path";

const router = express.Router();

cloudinary.v2.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.CLOUD_API_KEY, 
    api_secret: process.env.CLOUD_API_SECRET 
});

const storage = multer.diskStorage(
  {
    destination: function (req, file, cb) {
      const env = process.env.NODE_ENV || "development";
      const documentPath = env == "local" ? "../../" : "../../../";
      const folderPath = path.join(__dirname, documentPath, "documents")
      if(!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
      cb(null, folderPath);
    },
    filename: function (req, file, cb) {
      file.originalname = file.originalname.replace(/\s+/g, '');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, uniqueSuffix + "-" + file.originalname)
    }
  }
);
const upload = multer({storage});

router.post(
  "/upload-single",
  authMiddleware,
  validate("file:file"),
  upload.single('file'),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const file  = req.file as Express.Multer.File;
    res.send(createResponse(file.filename,"File uploaded successfully")) ;
  })
);


router.post(
  '/upload-multiple',
  authMiddleware,
  upload.array("file",5),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    const uploadedFileUrls = [];
    for (const file of files) {
      uploadedFileUrls.push(file.filename);
    }
    res.send(createResponse(uploadedFileUrls, 'Files uploaded successfully'));
  })
);

export default router;
