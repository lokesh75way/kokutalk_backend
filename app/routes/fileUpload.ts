import multer from 'multer' ;
import cloudinary from 'cloudinary'
import createHttpError from "http-errors";
import express from "express";
import expressAsyncHandler from "express-async-handler";
import { createResponse } from "../helper/response";
import { catchError, validate } from "../middleware/validation";
import fs from 'fs' ;
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

cloudinary.v2.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.CLOUD_API_KEY, 
    api_secret: process.env.CLOUD_API_SECRET 
  });

// const storage = multer.memoryStorage() ;
const storage = multer.diskStorage({});
const upload = multer({storage}) ;

router.post(
  "/uplaod-single",
  authMiddleware,
  validate("file:file"),
  upload.single('file'),
  catchError,
  expressAsyncHandler(async (req, res) => {
    const file  = req.file as Express.Multer.File ;
    const result = await cloudinary.v2.uploader.upload(file?.path, {
      resource_type: 'auto'
    });
    fs.unlinkSync(file?.path);
    const imageUrl = result.secure_url;
    res.send(createResponse(imageUrl,"File uploaded successfully")) ;
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
      const result = await cloudinary.v2.uploader.upload(file.path, {
        resource_type: 'auto'
      });
      uploadedFileUrls.push(result.secure_url);
      fs.unlinkSync(file?.path);
    }
    res.send(createResponse(uploadedFileUrls, 'Files uploaded successfully'));
  })
);

export default router;
