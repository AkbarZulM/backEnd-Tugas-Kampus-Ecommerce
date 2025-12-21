import prisma from "../utils/prisma.js";
import bcrypt from "bcrypt";

const ALLOWED_ADMIN_STATUS = new Set([
  "CONFIRMED",
  "ON_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);

export const createAdmin = async (req, res) => {
  try {
    const { name, email, phone, passwordHash, role } = req.body;

    if (!name || !email || !phone || !passwordHash || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (role !== "admin") {
      return res.status(400).json({ error: "Invalid role" });
    }

    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordHash, salt);

    const admin = await prisma.admin.create({
      data: { name, email, phone, passwordHash: hashedPassword, role },
    });

    return res.status(201).json(admin);
  } catch (error) {
    console.error("createAdmin error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const loginAdmin = async (req, res) => {
  const { email, passwordHash } = req.body;

  const admin = await prisma.admin.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!admin) return res.status(404).json({ error: "Admin not found" });

  const ok = await bcrypt.compare(passwordHash, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid password" });

  req.session.admin = {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  };

  req.session.save((err) => {
    if (err) {
      console.error("session save error:", err);
      return res.status(500).json({ error: "Session save failed" });
    }

    return res.json({
      message: "Login success",
      admin: req.session.admin,
    });
  });
};

export const getAllAdmin = async (req, res) => {
  try {
    const admins = await prisma.admin.findMany();
    return res.status(200).json(admins);
  } catch (error) {
    console.error("getAllAdmin error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) return res.status(404).json({ error: "Admin not found" });
    return res.status(200).json(admin);
  } catch (error) {
    console.error("getAdminById error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const updateAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(404).json({ error: "Admin not found" });
    const { name, email, phone } = req.body;
    const admin = await prisma.admin.update({
      where: { id },
      data: { name, email, phone },
    });
    return res.status(200).json(admin);
  } catch (error) {
    console.error("updateAdminById error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const deleteAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await prisma.admin.delete({ where: { id } });
    return res.status(200).json(admin);
  } catch (error) {
    console.error("deleteAdminById error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const deleteCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return res.status(200).json({ message: "Customer deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const adminGetOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { in: ["PENDING", "CONFIRMED"] } },
      include: {
        items: true,
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    console.log(orders);
    return res.status(200).json(orders);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

export const adminUpdateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;
    const adminId = req.admin.id;

    if (!orderId) return res.status(400).json({ error: "Missing orderId" });
    if (!ALLOWED_ADMIN_STATUS.has(status)) {
      return res.status(400).json({ error: "Invalid status for admin update" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId },
        select: { id: true, status: true },
      });
      if (!order) throw new Error("Order not found");

      if (status === "ON_DELIVERY" && order.status !== "CONFIRMED") {
        throw new Error("ON_DELIVERY hanya boleh setelah CONFIRMED");
      }
      if (status === "DELIVERED" && order.status !== "ON_DELIVERY") {
        throw new Error("DELIVERED hanya boleh setelah ON_DELIVERY");
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status,
          notes: notes ?? null,
          changedBy: adminId, // ✅ penting
        },
      });

      return updated;
    });

    return res.status(200).json({ ok: true, order: result });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
