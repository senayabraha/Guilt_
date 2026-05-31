import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

// GET /api/stores
// Public list of stores customers can browse (live = approved + active)
export const getStores = async (req: Request, res: Response) => {
    const { subCity, search } = req.query;

    const where: any = { isApproved: true, isActive: true };
    if (subCity) where.subCity = subCity as string;
    if (search) where.name = { contains: search as string, mode: "insensitive" };

    const stores = await prisma.store.findMany({
        where,
        orderBy: { name: "asc" },
    });

    res.json({ stores });
};

// GET /api/stores/:slug
// Single store by slug (preferred) or id, with its products
export const getStore = async (req: Request, res: Response) => {
    const slug = req.params.slug as string;

    const store = await prisma.store.findFirst({
        where: {
            isApproved: true,
            isActive: true,
            OR: [{ slug }, { id: slug }],
        },
    });

    if (!store) {
        return res.status(404).json({ message: "Store not found" });
    }

    const products = await prisma.product.findMany({
        where: { storeId: store.id },
        orderBy: { createdAt: "desc" },
    });

    const productsWithDiscount = products.map((p: any) => {
        const discount = p.originalPrice && p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
        return { ...p, discount };
    });

    res.json({ store: { ...store, products: productsWithDiscount } });
};
