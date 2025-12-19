import prisma from "../utils/prisma.js";
import bcrypt from "bcrypt";

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
  try {
    const { email, passwordHash } = req.body;

    if (!email || !passwordHash) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        passwordHash: true,
        createdAt: true,
      },
    });

    if (!admin) return res.status(404).json({ error: "Admin not found" });

    const isPasswordValid = await bcrypt.compare(
      passwordHash,
      admin.passwordHash
    );
    if (!isPasswordValid)
      return res.status(401).json({ error: "Invalid password" });

    // response minimal
    return res.status(200).json({
      message: "Login success",
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("loginAdmin error:", error);
    return res.status(500).json({ error: error.message });
  }
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
