import prisma from "../utils/prisma.js";
import { Prisma } from "@prisma/client";

import { recalcOrderTotals } from "../utils/helpres.js";

export const createDraftOrder = async (req, res) => {
  try {
    const customer = req.customer;
    const { deliveryType = "delivery", notes, deliveryFee = "0" } = req.body;

    // cegah banyak draft
    const existing = await prisma.order.findFirst({
      where: { customerId: customer.id, status: "PENDING" },
      select: { id: true, orderNumber: true },
    });
    if (existing) {
      return res.status(200).json({ ok: true, draft: existing, reused: true });
    }

    const draft = await prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        customerId: customer.id,
        deliveryType,
        customerPhone: customer.phone ?? "-",
        subtotal: "0",
        discountAmount: "0",
        deliveryFee: String(deliveryFee),
        totalAmount: String(deliveryFee),
        notes: notes ?? null,
        status: "PENDING",
      },
      select: { id: true, orderNumber: true, status: true },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: draft.id,
        status: "PENDING",
        notes: "Draft order created",
        changedBy: customer.id,
      },
    });

    return res.status(201).json({ ok: true, draft, reused: false });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};

export const getAllDataDraf = async (req, res) => {
  try {
    const customer = req.customer;
    const data = await prisma.order.findMany({
      where: { customerId: customer.id, status: "PENDING" },
      include: {
        items: true,
      },
    });
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};

export const addItemToOrder = async (req, res) => {
  try {
    const customer = req.customer;
    const { orderId } = req.params;
    const { productId, quantity = 1, notes, discountCode } = req.body;

    const qty = Number(quantity);
    if (!productId || !Number.isInteger(qty) || qty <= 0) {
      return res
        .status(400)
        .json({ error: "productId dan quantity 0 > 1 dibutuhkan" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, customerId: customer.id },
        select: { id: true, status: true, deliveryFee: true },
      });
      if (!order) throw new Error("Order tidak ditemukan");
      if (order.status !== "PENDING")
        throw new Error("Order tidak bisa diubah karena bukan PENDING");

      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, price: true, stock: true },
      });
      if (!product) throw new Error("Produk tidak valid");

      if (typeof product.stock === "number" && product.stock < qty) {
        throw new Error(`Stok tidak cukup untuk ${product.name}`);
      }

      const unitPrice = new Prisma.Decimal(product.price.toString());

      // cek apakah item sudah ada di order
      const existingItem = await tx.orderItem.findFirst({
        where: { orderId: order.id, productId: product.id },
        select: { id: true, quantity: true },
      });

      let item;
      if (existingItem) {
        const newQty = existingItem.quantity + qty;
        const totalPrice = unitPrice.mul(newQty);

        item = await tx.orderItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQty,
            unitPrice,
            totalPrice,
            notes: notes ?? undefined,
          },
        });
      } else {
        const totalPrice = unitPrice.mul(qty);

        item = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            productName: product.name,
            quantity: qty,
            unitPrice,
            totalPrice,
            notes: notes ?? null,
          },
        });
      }

      // recalc totals + apply/update voucher snapshot
      const updatedOrder = await recalcOrderTotals(tx, {
        orderId: order.id,
        discountCode: discountCode ?? null,
        deliveryFee: order.deliveryFee,
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "PENDING",
          notes: existingItem
            ? "Order item quantity updated"
            : "Order item added",
          changedBy: customer.id,
        },
      });

      return { order: updatedOrder, item };
    });

    return res.json({ ok: true, data: result });
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message });
  }
};

export const payment = async (req, res) => {
  try {
    const customer = req.customer;
    const { orderId } = req.params;
    const {
      paymentMethod = "BANK_TRANSFER",
      paymentStatus,
      bankName,
      accountNumber,
      accountName,
    } = req.body;

    const amount = await prisma.order.findFirst({
      where: { id: orderId, customerId: customer.id },
      select: { totalAmount: true },
    });

    if (!req.file) {
      throw new Error("Bukti transfer wajib diupload");
    }

    const transferProofUrlCloudinary = req.file.path;
    const publicProofId = req.file.filename;

    if (publicProofId && !publicProofId.startsWith("products/")) {
      publicProofId = `products/${publicProofId}`;
    }

    if (!publicProofId) {
      throw new Error("Gagal mengambil public_id Cloudinary");
    }

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, customerId: customer.id, status: "PENDING" },
        select: { id: true, totalAmount: true },
      });

      if (!order) throw new Error("Order tidak ditemukan");

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          amount: amount.totalAmount,
          paymentMethod,
          paymentStatus,
          bankName,
          accountNumber,
          accountName,
          transferProofUrl: transferProofUrlCloudinary,
          transferProofId: publicProofId,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: "CONFIRMED" },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: "CONFIRMED",
          notes: "Order dibayar",
          changedBy: customer.id,
        },
      });

      return { order: updatedOrder, payment };
    });

    return res.status(200).json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};

export const getPaymentsByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment = await prisma.payment.findFirst({
      where: { orderId },
    });
    return res.status(200).json(payment);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
