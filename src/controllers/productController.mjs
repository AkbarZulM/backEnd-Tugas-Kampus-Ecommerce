import prisma from "../utils/prisma.js";

export const createProduct = async (req, res) => {
  try {
    const { sku, name, description, price, cost, stock, category } = req.body;

    const existingProduct = await prisma.product.findUnique({ where: { sku } });
    if (existingProduct) {
      return res.status(400).json({ error: "Product already exists" });
    }

    const imageUrl = "/" + req.file.path.replace(/\\/g, "/");

    if (!imageUrl) {
      return res.status(400).json({ error: "Image is required" });
    }

    if (
      !sku ||
      !name ||
      !description ||
      !price ||
      !cost ||
      !stock ||
      !category ||
      !imageUrl
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const stockInt = parseInt(stock);
    if (isNaN(stockInt) || stockInt <= 0) {
      return res.status(400).json({ error: "Invalid stock value" });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        description,
        price,
        cost,
        stock: stockInt,
        category,
        imageUrl,
      },
    });
    console.log("Product created:", product);
    return res.status(201).json(product);
  } catch (error) {
    console.error("createProduct error:", error);
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
