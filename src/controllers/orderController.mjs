import prisma from "../utils/prisma.js";
import { Prisma } from "@prisma/client";

import { recalcOrderTotals } from "../utils/helpres.js";

export const createDraftOrder = async (req, res) => {
  try {
    const customer = req.customer;
    const { deliveryType = "delivery", notes, deliveryFee = "0" } = req.body;

    // cegah banyak draft
    const existing = await prisma.order.findFirst({
      where: { customerId: customer.id, status: "DRAFT" },
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
        status: "DRAFT",
      },
      select: { id: true, orderNumber: true, status: true },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: draft.id,
        status: "DRAFT",
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

export const getAllDataOrder = async (req, res) => {
  try {
    const customer = req.customer;

    const data = await prisma.order.findMany({
      where: {
        customerId: customer.id,
        status: {
          in: ["DRAFT", "PENDING", "ON_DELIVERY", "DELIVERED"],
        },
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};

export const getMyOrderStatusHistory = async (req, res) => {
  try {
    const customerId = req.customer.id;

    const history = await prisma.orderStatusHistory.findMany({
      where: {
        status: { in: ["CONFIRMED", "CANCELLED", "REFUNDED"] },
        order: { customerId },
      },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            paymentMethod: true,
            discountAmount: true,
            deliveryFee: true,
            orderNumber: true,
          },
        },
      },
    });

    return res.status(200).json(history);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

export const deleteDraftOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const customerId = req.customer.id;

    if (!orderId) return res.status(400).json({ error: "Missing orderId" });

    const result = await prisma.order.deleteMany({
      where: { id: orderId, customerId, status: "DRAFT" },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Draft order not found" });
    }

    return res.status(200).json({ message: "Order draft berhasil dihapus" });
  } catch (e) {
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
      if (order.status !== "DRAFT")
        throw new Error("Order tidak bisa diubah karena bukan DRAFT");

      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, price: true, stock: true },
      });
      if (!product) throw new Error("Produk tidak valid");

      if (typeof product.stock === "number" && product.stock < qty) {
        throw new Error(`Stok tidak cukup untuk ${product.name}`);
      }

      const unitPrice = new Prisma.Decimal(product.price.toString());

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

      const updatedOrder = await recalcOrderTotals(tx, {
        orderId: order.id,
        discountCode: discountCode ?? null,
        deliveryFee: order.deliveryFee,
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "DRAFT",
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

export const checkoutDraftOrder = async (req, res) => {
  try {
    const customerId = req.customer.id;
    const { orderId } = req.params;

    if (!orderId) return res.status(400).json({ error: "Missing orderId" });

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, customerId, status: "DRAFT" },
        include: { items: true },
      });

      if (!order) throw new Error("Draft order not found");
      if (!order.items || order.items.length === 0) {
        throw new Error("Draft order masih kosong");
      }

      // pastikan total sudah benar
      const updated = await recalcOrderTotals(tx, {
        orderId: order.id,
        discountCode: null,
        deliveryFee: order.deliveryFee,
      });

      const pendingOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: "PENDING" },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "PENDING",
          notes: "Checkout: draft menjadi pending",
          changedBy: customerId,
        },
      });

      return { order: pendingOrder, totals: updated };
    });

    return res.status(200).json({ ok: true, data: result });
  } catch (e) {
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
    let publicProofId = req.file.filename;

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

export const paymentStatusUpdate = async (req, res) => {
  try {
    const { orderId, paymentId } = req.params;
    const { paymentStatus } = req.body;
    const paymentCheck = await prisma.payment.findFirst({
      where: { id: paymentId, orderId: orderId },
    });

    if (!paymentCheck)
      return res.status(404).json({ error: "Payment not found" });

    const payment = await prisma.payment.update({
      where: { id: paymentCheck.id },
      data: { paymentStatus, completedAt: new Date() },
    });

    if (payment.paymentStatus === "COMPLETED") {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "CONFIRMED" },
      });

      await prisma.orderStatusHistory.create({
        data: {
          orderId,
          status: "CONFIRMED",
          notes: "Order dibayar",
          changedBy: req.customer.id,
        },
      });
    }

    return res.status(200).json(payment);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};

export const getPaymentsByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) return res.status(404).json({ error: "not found" });
    const payment = await prisma.payment.findFirst({
      where: { orderId },
    });
    return res.status(200).json(payment);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
};
