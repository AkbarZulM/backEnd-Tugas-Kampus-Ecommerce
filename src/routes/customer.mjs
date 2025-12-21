import { Router } from "express";
import { requireCustomer } from "../utils/helpres.js";
import {
  registerCustomer,
  createAddress,
  getAllCustomers,
  getCustomerById,
  getAddressesByCustomerId,
  loginCustomer,
  patchCustomer,
  logoutCustomer,
  patchAddressById,
} from "../controllers/customerController.mjs";

const router = Router();

router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
router.post("/address", createAddress);
router.get("/", getAllCustomers);
router.get("/:id", requireCustomer, getCustomerById);
router.get("/addres/:id", requireCustomer, getAddressesByCustomerId);
router.post("/logout", requireCustomer, logoutCustomer);
router.patch("/me", requireCustomer, patchCustomer);
router.patch("/address/:id", requireCustomer, patchAddressById);

export default router;
