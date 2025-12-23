import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { createRequire } from "module";
import dotenv from "dotenv";
import path from "path";

// 1. FORCE LOAD .env from the root of your project
// process.cwd() gets the folder where you started 'npm run dev'
const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

// 2. DEBUGGING: Print exactly what we found (Check your terminal for this!)
console.log("-------------------------------------------------------");
console.log("📂 Loading .env from:", envPath);
console.log("🔍 CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME || "❌ MISSING");
console.log("🔍 CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY ? "✅ FOUND" : "❌ MISSING");
console.log("-------------------------------------------------------");

// 3. Fix the "CommonJS" library issue
const require = createRequire(import.meta.url);
const multerCloudinary = require("multer-storage-cloudinary");
const CloudinaryStorage = multerCloudinary.CloudinaryStorage || multerCloudinary.default || multerCloudinary;

// 4. Configure Cloudinary
// We use (|| "") to stop TypeScript from complaining about undefined
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

// 5. Create Storage
const storage = new CloudinaryStorage({
  cloudinary: { v2: cloudinary },
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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      // @ts-ignore
      cb(new Error("Only images allowed"), false);
    }
  },
});