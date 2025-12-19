import { Router } from "express";
import {
  createAdmin,
  loginAdmin,
  getAllAdmin,
  getAdminById,
  updateAdminById,
  deleteAdminById,
} from "../controllers/adminController.mjs";
const router = Router();

router.post("/register", createAdmin);
router.post("/login", loginAdmin);
router.get("/", getAllAdmin);
router.get("/:id", getAdminById);
router.put("/:id", updateAdminById);
router.delete("/:id", deleteAdminById);
export default router;
