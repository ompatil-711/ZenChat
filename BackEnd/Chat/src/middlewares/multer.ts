import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const multerCloudinary = require("multer-storage-cloudinary");
const CloudinaryStorage = multerCloudinary.CloudinaryStorage || multerCloudinary.default || multerCloudinary;

// 2. Configure Cloudinary (Added 'as string' to fix your current error)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME as string,
  api_key: process.env.CLOUDINARY_API_KEY as string,
  api_secret: process.env.CLOUDINARY_API_SECRET as string,
});

// 3. Create Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "chat-images",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [
      { width: 800, height: 600, crop: "limit" },
      { quality: "auto" },
    ],
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      // @ts-ignore
      cb(new Error("Only images allowed"), false);
    }
  },
});