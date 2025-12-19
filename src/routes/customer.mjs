import { Router } from "express";
import {
  registerCustomer,
  createAddress,
  getAllCustomers,
  getCustomerById,
  getAddressesByCustomerId,
  loginCustomer,
  patchCustomerById,
  deleteCustomerById,
} from "../controllers/customerController.mjs";
const router = Router();

router.post("/register", registerCustomer);
router.post("/login", loginCustomer);
router.post("/address", createAddress);
router.get("/:id", getCustomerById);
router.get("/addres/:id", getAddressesByCustomerId);
router.get("/", getAllCustomers);
router.patch("/:id", patchCustomerById);
router.delete("/:id", deleteCustomerById);

export default router;
