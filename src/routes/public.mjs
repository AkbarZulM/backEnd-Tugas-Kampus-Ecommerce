import express from "express";
import { requireCustomer } from "../utils/helpres.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import uploadMulter from "../utils/multer.js";
import {
  createProduct,
  getAllProducts,
  getProductById,
  deleteProduct,
} from "../controllers/productController.mjs";

import {
  createDraftOrder,
  addItemToOrder,
  getAllDataOrder,
  payment,
  getPaymentsByOrderId,
  deleteDraftOrder,
  paymentStatusUpdate,
  getMyOrderStatusHistory,
  checkoutDraftOrder,
} from "../controllers/orderController.mjs";

const router = express.Router();

router.post("/product-create", uploadMulter.single("imageUrl"), createProduct);
router.get("/products", getAllProducts);
router.get("/product/:id", getProductById);
router.delete("/product/:id", deleteProduct);

// order
router.post("/draft", requireCustomer, createDraftOrder);
router.post("/:orderId/items", requireCustomer, addItemToOrder);
router.post("/orders/:orderId/checkout", requireCustomer, checkoutDraftOrder);
router.get("/draft", requireCustomer, getAllDataOrder);
router.get("/orders/status-history", requireCustomer, getMyOrderStatusHistory);
router.delete("/draft/:orderId", requireCustomer, deleteDraftOrder);

// payment
router.patch(
  "/:paymentId/payment/:orderId",
  requireCustomer,
  paymentStatusUpdate
);
router.post(
  "/payment/:orderId",
  requireCustomer,
  uploadCloudinary.single("transferProofUrl"),
  payment
);
router.get("/payment/:orderId", getPaymentsByOrderId);

export default router;
