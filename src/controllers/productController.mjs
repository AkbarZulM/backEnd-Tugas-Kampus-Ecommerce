import prisma from "../utils/prisma.js";

export const createProduct = async (req, res) => {
  try {
    const { sku, name, description, price, cost, stock, category } = req.body;

    if (!req.file) {
      return res
        .status(400)
        .json({ error: "Image is required (field: imageUrl)" });
    }

    if (
      !sku ||
      !name ||
      !description ||
      !price ||
      !cost ||
      !stock ||
      !category
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingProduct = await prisma.product.findUnique({ where: { sku } });
    if (existingProduct) {
      return res.status(400).json({ error: "Product already exists" });
    }

    const stockInt = Number.parseInt(stock, 10);
    if (!Number.isInteger(stockInt) || stockInt <= 0) {
      return res.status(400).json({ error: "Invalid stock value" });
    }

    const priceNum = Number(price);
    const costNum = Number(cost);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: "Invalid price value" });
    }
    if (!Number.isFinite(costNum) || costNum < 0) {
      return res.status(400).json({ error: "Invalid cost value" });
    }

    const imageUrl = "/" + req.file.path.replace(/\\/g, "/");

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        price: priceNum,
        cost: costNum,
        stock: stockInt,
        category,
        imageUrl,
      },
    });

    return res.status(201).json(product);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    return res.status(200).json(products);
  } catch (error) {
    console.error("getAllProducts error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.status(200).json(product);
  } catch (error) {
    console.error("getProductById error:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(404).json({ error: "Product not found" });
    await prisma.product.delete({ where: { id } });
    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("deleteProduct error:", error);
    return res.status(500).json({ error: error.message });
  }
};
