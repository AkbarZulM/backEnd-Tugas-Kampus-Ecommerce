import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma.js";

export async function requireCustomer(req, res, next) {
  try {
    const sessCustomer = req.session?.customer;
    if (!sessCustomer?.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // cek ulang ke DB: masih ada & belum soft delete
    const customer = await prisma.customer.findFirst({
      where: { id: sessCustomer.id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
      },
    });

    if (!customer) {
      req.session.destroy(() => {});
      res.clearCookie("sid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      return res.status(401).json({ error: "Session invalid" });
    }

    req.customer = customer;
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export const requireAdmin = (req, res, next) => {
  const admin = req.session?.admin;
  if (!admin?.id) return res.status(401).json({ error: "Admin not found" });

  req.admin = admin;
  next();
};

async function applyDiscount(tx, { discountCode, subtotal }) {
  if (!discountCode) {
    return {
      discount: null,
      discountAmount: new Prisma.Decimal("0"),
    };
  }

  const now = new Date();

  const discount = await tx.discount.findFirst({
    where: {
      code: discountCode,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });

  if (!discount)
    throw new Error("Voucher tidak valid / tidak aktif / sudah expired");

  const subtotalDec = new Prisma.Decimal(subtotal.toString());

  if (subtotalDec.lt(discount.minimumPurchase)) {
    throw new Error("Minimum pembelian belum memenuhi syarat voucher");
  }

  // fixed amount
  let discountAmount = new Prisma.Decimal(discount.discountValue.toString());

  // cap
  if (discount.maximumDiscount) {
    const maxDec = new Prisma.Decimal(discount.maximumDiscount.toString());
    if (discountAmount.gt(maxDec)) discountAmount = maxDec;
  }

  // jangan melebihi subtotal
  if (discountAmount.gt(subtotalDec)) discountAmount = subtotalDec;

  return { discount, discountAmount };
}

export async function recalcOrderTotals(
  tx,
  { orderId, discountCode, deliveryFee }
) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { totalPrice: true },
  });

  let subtotal = new Prisma.Decimal("0");
  for (const it of items) subtotal = subtotal.add(it.totalPrice);

  const deliveryFeeDec = new Prisma.Decimal(String(deliveryFee ?? 0));

  const { discount, discountAmount } = await applyDiscount(tx, {
    discountCode: discountCode ?? null,
    subtotal,
  });

  const totalAmount = subtotal.sub(discountAmount).add(deliveryFeeDec);
  if (totalAmount.isNegative())
    throw new Error("totalAmount tidak boleh negatif");

  // update order totals
  const order = await tx.order.update({
    where: { id: orderId },
    data: {
      subtotal,
      discountAmount,
      deliveryFee: deliveryFeeDec,
      totalAmount,
    },
  });

  // sync snapshot voucher (OrderDiscount)
  if (discount) {
    await tx.orderDiscount.upsert({
      where: { orderId }, // karena orderId unique
      create: {
        orderId,
        discountId: discount.id,
        discountCode: discount.code,
        discountAmount,
      },
      update: {
        discountId: discount.id,
        discountCode: discount.code,
        discountAmount,
      },
    });
  } else {
    // kalau voucher tidak ada / invalid / dihapus: hapus snapshotnya
    await tx.orderDiscount.deleteMany({ where: { orderId } });
  }

  return order;
}
