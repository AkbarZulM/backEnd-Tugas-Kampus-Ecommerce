import prisma from "../utils/prisma.js";
import bcrypt from "bcrypt";

export const registerCustomer = async (req, res) => {
  try {
    const { name, email, phone, passwordHash } = req.body;

    if (!name || !email || !phone || !passwordHash) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { email },
    });
    if (existingCustomer) {
      return res.status(400).json({ error: "Customer already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordHash, salt);

    const customer = await prisma.customer.create({
      data: { name, email, phone, passwordHash: hashedPassword },
    });

    return res.status(201).json(customer);
  } catch (error) {
    console.error("registerCustomer error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const loginCustomer = async (req, res) => {
  try {
    const { email, passwordHash } = req.body;

    if (!email || !passwordHash) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const customer = await prisma.customer.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        passwordHash: true,
        createdAt: true,
      },
    });

    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const isPasswordValid = await bcrypt.compare(
      passwordHash,
      customer.passwordHash
    );

    if (!isPasswordValid)
      return res.status(401).json({ error: "Invalid password" });

    req.session.customer = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.createdAt,
    };

    return res.status(200).json({ massage: "Login successful" });
  } catch (error) {
    console.error("loginCustomer error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const logoutCustomer = (req, res) => {
  if (!req.session) return res.status(200).json({ message: "Logged out" });
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.clearCookie("sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return res.status(200).json({ message: "Logged out" });
  });
};

export const createAddress = async (req, res) => {
  try {
    const {
      customerId,
      label,
      address,
      city,
      province,
      postalCode,
      latitude,
      longitude,
    } = req.body;

    if (
      !customerId ||
      !label ||
      !address ||
      !city ||
      !province ||
      !postalCode ||
      !latitude ||
      !longitude
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const newAddress = await prisma.address.create({
      data: {
        address,
        customerId,
        label,
        city,
        province,
        postalCode,
        latitude,
        longitude,
      },
    });

    return res.status(201).json(newAddress);
  } catch (error) {
    console.error("createAddress error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    return res.status(200).json(customer);
  } catch (error) {
    console.error("getCustomerById error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const getAllCustomers = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany();
    return res.status(200).json(customers);
  } catch (error) {
    console.error("getAllCustomers error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const patchCustomer = async (req, res) => {
  try {
    const customerId = req.customer?.id || req.session?.customer?.id;
    const { name, email, phone } = req.body;

    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data,
    });
    return res.status(200).json({
      message: "Customer updated successfully",
      customer,
    });
  } catch (error) {
    console.error("updateCustomerById error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const getAddressesByCustomerId = async (req, res) => {
  try {
    const { customerId } = req.params;
    const addresses = await prisma.address.findMany({
      where: { customerId },
    });
    return res.status(200).json(addresses);
  } catch (error) {
    console.error("getAddressesByCustomerId error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const patchAddressById = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.customer?.id || req.session?.customer?.id;

    const { address, label, city, province, postalCode, latitude, longitude } =
      req.body;

    if (!id) return res.status(400).json({ error: "Missing address id" });
    if (!customerId) return res.status(401).json({ error: "Unauthorized" });

    const data = {};
    if (address !== undefined) data.address = address;
    if (label !== undefined) data.label = label;
    if (city !== undefined) data.city = city;
    if (province !== undefined) data.province = province;
    if (postalCode !== undefined) data.postalCode = postalCode;
    if (latitude !== undefined) data.latitude = latitude;
    if (longitude !== undefined) data.longitude = longitude;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const exists = await prisma.address.findFirst({
      where: { id, customerId },
      select: { id: true },
    });

    if (!exists) {
      return res.status(404).json({ error: "Address not found" });
    }

    const addressCustomer = await prisma.address.update({
      where: { id },
      data,
    });

    return res.status(200).json(addressCustomer);
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Address not found" });
    }
    return res.status(500).json({ error: error.message });
  }
};

export const deleteAddressById = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await prisma.address.delete({ where: { id } });
    return res.status(200).json(address);
  } catch (error) {
    console.error("deleteAddressById error:", error);
    return res.status(500).json({ error: error.message });
  }
};
