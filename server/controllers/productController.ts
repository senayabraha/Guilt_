import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { StoreStatus } from "../generated/prisma/enums.js";

const storePublicSelect = {
    id: true,
    name: true,
    logo: true,
    address: true,
    city: true,
    state: true,
    phone: true,
    status: true,
    isOpen: true,
    deliveryFee: true,
    minOrder: true,
};

const withDiscount = (product: any) => {
    const discount = product.originalPrice && product.price ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
    return { ...product, discount };
};

const getApprovedVendorStore = async (userId: string) => {
    return prisma.store.findFirst({ where: { ownerId: userId, status: StoreStatus.APPROVED } });
};

const getVendorStore = async (userId: string) => {
    return prisma.store.findFirst({ where: { ownerId: userId } });
};

// GET /api/products/flash-deals
export const getFlashDeals = async (req: Request, res: Response) => {
    const products = await prisma.product.findMany({
        where: {
            stock: { gt: 0 },
            isActive: true,
            OR: [
                { storeId: null },
                { store: { status: StoreStatus.APPROVED, isOpen: true } },
            ],
        },
        include: { store: { select: storePublicSelect } },
        orderBy: { originalPrice: "desc" },
    });

    res.json({ products: products.map(withDiscount).slice(0, 8) });
};

// GET /api/products
export const getProducts = async (req: Request, res: Response) => {
    const { storeId, category, search, minPrice, maxPrice, sort } = req.query;

    // Build AND conditions so the store-visibility filter is never overridden by search/store filters.
    const and: any[] = [];

    // Store visibility: a specific store (must be approved & open) or any approved
    // store plus legacy platform-owned products (storeId null).
    if (storeId) {
        and.push({ storeId: storeId as string });
        and.push({ store: { status: StoreStatus.APPROVED, isOpen: true } });
    } else {
        and.push({
            OR: [
                { storeId: null },
                { store: { status: StoreStatus.APPROVED, isOpen: true } },
            ],
        });
    }

    if (category && category !== "all") and.push({ category: category as string });

    if (search) {
        and.push({
            OR: [
                { name: { contains: search as string, mode: "insensitive" } },
                { description: { contains: search as string, mode: "insensitive" } },
            ],
        });
    }

    if (minPrice || maxPrice) {
        const price: any = {};
        if (minPrice) price.gte = Number(minPrice);
        if (maxPrice) price.lte = Number(maxPrice);
        and.push({ price });
    }

    const where: any = {
        isActive: true,
        stock: { gt: 0 },
        AND: and,
    };

    const orderBy: any = {};
    if (sort === "price-low") orderBy.price = "asc";
    else if (sort === "price-high") orderBy.price = "desc";
    else orderBy.createdAt = "desc";

    const products = await prisma.product.findMany({ where, orderBy, include: { store: { select: storePublicSelect } } });

    res.json({ products: products.map(withDiscount) });
};

// GET /api/products/:id
export const getProduct = async (req: Request, res: Response) => {
    const product = await prisma.product.findFirst({
        where: {
            id: req.params.id as string,
            isActive: true,
            OR: [
                { storeId: null },
                { store: { status: StoreStatus.APPROVED, isOpen: true } },
            ],
        },
        include: { store: { select: storePublicSelect } },
    });

    if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
    }

    res.json({ product: withDiscount(product) });
};

// POST /api/products (admin)
export const createProduct = async (req: Request, res: Response) => {
    const product = await prisma.product.create({ data: req.body });
    res.status(201).json({ product });
};

// PUT /api/products/:id (admin)
export const updateProduct = async (req: Request, res: Response) => {
    const product = await prisma.product.update({ where: { id: req.params.id as string }, data: req.body });
    res.json({ product });
};

// DELETE /api/products/:id (admin)
export const deleteProduct = async (req: Request, res: Response) => {
    await prisma.product.update({
        where: { id: req.params.id as string },
        data: { isActive: false, stock: Number(0) },
    });
    res.json({ message: "Product disabled" });
};

// GET /api/vendor/products
export const getVendorProducts = async (req: Request, res: Response) => {
    const store = await getVendorStore(req.user!.id);
    if (!store) return res.status(404).json({ message: "No store found for this vendor" });

    const products = await prisma.product.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" } });
    res.json({ products, store });
};

// POST /api/vendor/products
export const createVendorProduct = async (req: Request, res: Response) => {
    const store = await getApprovedVendorStore(req.user!.id);
    if (!store) return res.status(403).json({ message: "Your store must be approved before creating products" });

    const { name, description, price, originalPrice, image, category, unit, stock, isOrganic, isActive } = req.body;
    if (!name || price === undefined || !image || !category) {
        return res.status(400).json({ message: "Name, price, image, and category are required" });
    }

    const product = await prisma.product.create({
        data: {
            storeId: store.id,
            name,
            description: description || "",
            price: Number(price),
            originalPrice: originalPrice === undefined ? 0 : Number(originalPrice),
            image,
            category,
            unit: unit || "piece",
            stock: stock === undefined ? 0 : Number(stock),
            isOrganic: Boolean(isOrganic),
            isActive: isActive === undefined ? true : Boolean(isActive),
        },
    });

    res.status(201).json({ product });
};

// PUT /api/vendor/products/:id
export const updateVendorProduct = async (req: Request, res: Response) => {
    const store = await getVendorStore(req.user!.id);
    if (!store) return res.status(404).json({ message: "No store found for this vendor" });

    const product = await prisma.product.findFirst({ where: { id: req.params.id as string, storeId: store.id } });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const blockedFields = ["id", "storeId", "createdAt", "updatedAt"];
    const data: any = {};
    for (const [key, value] of Object.entries(req.body)) {
        if (!blockedFields.includes(key)) data[key] = value;
    }

    if (data.price !== undefined) data.price = Number(data.price);
    if (data.originalPrice !== undefined) data.originalPrice = Number(data.originalPrice);
    if (data.stock !== undefined) data.stock = Number(data.stock);

    const updatedProduct = await prisma.product.update({ where: { id: product.id }, data });
    res.json({ product: updatedProduct });
};

// DELETE /api/vendor/products/:id
export const deleteVendorProduct = async (req: Request, res: Response) => {
    const store = await getVendorStore(req.user!.id);
    if (!store) return res.status(404).json({ message: "No store found for this vendor" });

    const product = await prisma.product.findFirst({ where: { id: req.params.id as string, storeId: store.id } });
    if (!product) return res.status(404).json({ message: "Product not found" });

    await prisma.product.update({ where: { id: product.id }, data: { isActive: false, stock: 0 } });
    res.json({ message: "Product disabled" });
};
