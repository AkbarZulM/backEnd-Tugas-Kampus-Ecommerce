import express from "express";
import { requireCustomer } from "../utils/helpres.js";
import { uploadCloudinary } from "../utils/cloudinary.js";

import {
  createProduct,
  getAllProducts,
  getProductById,
} from "../controllers/productController.mjs";

import {
  createDraftOrder,
  addItemToOrder,
  getAllDataDraf,
  payment,
  getPaymentsByOrderId,
} from "../controllers/orderController.mjs";

import upload from "../utils/multer.js";
const router = express.Router();

router.post("/product-create", upload.single("imageUrl"), createProduct);
router.get("/products", getAllProducts);
router.get("/product/:id", getProductById);

// order
router.post("/draft", requireCustomer, createDraftOrder);
router.post("/:orderId/items", requireCustomer, addItemToOrder);
router.get("/draft", requireCustomer, getAllDataDraf);
router.post(
  "/payment/:orderId",
  requireCustomer,
  uploadCloudinary.single("transferProofUrl"),
  payment
);
router.get("/payment/:orderId", getPaymentsByOrderId);

export default router;
