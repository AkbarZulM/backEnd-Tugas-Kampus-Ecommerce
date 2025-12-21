import multer from "multer";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/images/"),
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const limits = {
  fileSize: 4 * 1024 * 1024, // 4MB
};

const filter = (req, file, cb) => {
  const ok = ["image/png", "image/jpeg", "image/jpg"].includes(file.mimetype);
  if (ok) return cb(null, true);
  return cb(new Error("Only .png, .jpg and .jpeg format allowed!"), false);
};

const uploadMulter = multer({
  storage: storage,
  limits: limits,
  fileFilter: filter,
});

export default uploadMulter;
