import multer from "multer";
import type { StorageEngine } from "multer";
import cloudinary from "../config/cloudinary.js";
import { HttpError } from "@zenchat/database";

// Map Cloudinary's result explicitly to the fields consumed by the controller.
export const imageStorage: StorageEngine = {
  _handleFile(_req, file, callback) {
    const stream = cloudinary.uploader.upload_stream({
      folder: "chat-images", resource_type: "image", allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
      transformation: [{ width: 800, height: 600, crop: "limit" }, { quality: "auto" }], timeout: 15000,
    }, (error, result) => {
      if (error || !result) { callback(error || new Error("Image upload failed")); return; }
      callback(null, { path: result.secure_url, filename: result.public_id, size: result.bytes });
    });
    file.stream.on("error", error => stream.destroy(error));
    file.stream.pipe(stream);
  },
  _removeFile(_req, file, callback) {
    if (!file.filename) { callback(null); return; }
    void cloudinary.uploader.destroy(file.filename).then(() => callback(null), error => callback(error));
  },
};
export const upload = multer({
  storage: imageStorage, limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2, fieldSize: 20000 },
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, "Supported images: JPEG, PNG, GIF, WebP."));
  },
});
