import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "products", // folder di cloudinary
    resource_type: "image",
    format: "webp", // auto jadi webp (lebih ringan)
    public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
  }),
});

export const uploadCloudinary = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["image/png", "image/jpg", "image/jpeg"].includes(file.mimetype);
    if (!ok) return cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
    cb(null, true);
  },
});
