import express from "express";
import {
  createAdmin,
  loginAdmin,
  getAllAdmin,
  getAdminById,
  updateAdminById,
  deleteAdminById,
  deleteCustomerById,
  adminGetOrders,
  adminUpdateOrderStatus,
} from "../controllers/adminController.mjs";
import { requireAdmin } from "../utils/helpres.js";

const router = express.Router();

// TEST route paling atas
router.get("/ping", (req, res) => res.json({ ok: true }));

router.post("/register", createAdmin);
router.post("/login", loginAdmin);

// routes spesifik
router.get("/orders", requireAdmin, adminGetOrders);
router.patch("/orders/:orderId/status", requireAdmin, adminUpdateOrderStatus);

router.delete("/customer/:id", requireAdmin, deleteCustomerById);

//  root
router.get("/", requireAdmin, getAllAdmin);

// wildcard param
router.get("/:id", requireAdmin, getAdminById);
router.patch("/:id", requireAdmin, updateAdminById);
router.delete("/:id", requireAdmin, deleteAdminById);

export default router;
