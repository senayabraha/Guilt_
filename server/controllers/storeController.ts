import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { StoreStatus, UserRole } from "../generated/prisma/enums.js";

const storeSelect = {
    id: true,
    name: true,
    description: true,
    phone: true,
    email: true,
    logo: true,
    coverImage: true,
    address: true,
    city: true,
    state: true,
    zip: true,
    lat: true,
    lng: true,
    categories: true,
    status: true,
    isOpen: true,
    deliveryRadius: true,
    deliveryFee: true,
    minOrder: true,
    commissionRate: true,
    createdAt: true,
    updatedAt: true,
};

const getVendorStoreOr404 = async (userId: string) => {
    return prisma.store.findFirst({ where: { ownerId: userId }, orderBy: { createdAt: "asc" } });
};

export const getPublicStores = async (req: Request, res: Response) => {
    const { search, category } = req.query;
    const where: any = { status: StoreStatus.APPROVED, isOpen: true };

    if (search) {
        where.OR = [
            { name: { contains: search as string, mode: "insensitive" } },
            { description: { contains: search as string, mode: "insensitive" } },
        ];
    }

    if (category && category !== "all") {
        where.categories = { has: category as string };
    }

    const stores = await prisma.store.findMany({
        where,
        select: {
            ...storeSelect,
            _count: { select: { products: true, orders: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    res.json({ stores });
};

export const getPublicStore = async (req: Request, res: Response) => {
    const store = await prisma.store.findFirst({
        where: { id: req.params.id, status: StoreStatus.APPROVED, isOpen: true },
        select: {
            ...storeSelect,
            _count: { select: { products: true, orders: true } },
        },
    });

    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json({ store });
};

export const getPublicStoreProducts = async (req: Request, res: Response) => {
    const store = await prisma.store.findFirst({ where: { id: req.params.id, status: StoreStatus.APPROVED, isOpen: true } });
    if (!store) return res.status(404).json({ message: "Store not found" });

    const products = await prisma.product.findMany({
        where: { storeId: store.id, isActive: true, stock: { gt: 0 } },
        include: { store: { select: storeSelect } },
        orderBy: { createdAt: "desc" },
    });

    res.json({ products });
};

export const applyForStore = async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { name, description, phone, email, logo, coverImage, address, city, state, zip, lat, lng, categories, deliveryRadius, deliveryFee, minOrder } = req.body;

    if (!name || !address || !city || !state) {
        return res.status(400).json({ message: "Store name, address, city, and state are required" });
    }

    const existingStore = await prisma.store.findFirst({ where: { ownerId: userId } });
    if (existingStore) {
        return res.status(400).json({ message: "You already have a store application" });
    }

    const store = await prisma.store.create({
        data: {
            ownerId: userId,
            name,
            description: description || "",
            phone: phone || "",
            email: email || "",
            logo: logo || "",
            coverImage: coverImage || "",
            address,
            city,
            state,
            zip: zip || "",
            lat: lat === undefined || lat === null || lat === "" ? undefined : Number(lat),
            lng: lng === undefined || lng === null || lng === "" ? undefined : Number(lng),
            categories: Array.isArray(categories) ? categories : [],
            deliveryRadius: deliveryRadius === undefined ? 5 : Number(deliveryRadius),
            deliveryFee: deliveryFee === undefined ? 1.99 : Number(deliveryFee),
            minOrder: minOrder === undefined ? 0 : Number(minOrder),
            status: StoreStatus.PENDING,
        },
    });

    await prisma.user.update({ where: { id: userId }, data: { role: UserRole.VENDOR } });

    res.status(201).json({ store });
};

export const getVendorStore = async (req: Request, res: Response) => {
    const store = await getVendorStoreOr404(req.user!.id);
    if (!store) return res.status(404).json({ message: "No store found for this vendor" });
    res.json({ store });
};

export const updateVendorStore = async (req: Request, res: Response) => {
    const store = await getVendorStoreOr404(req.user!.id);
    if (!store) return res.status(404).json({ message: "No store found for this vendor" });

    const allowedFields = ["name", "description", "phone", "email", "logo", "coverImage", "address", "city", "state", "zip", "lat", "lng", "categories", "deliveryRadius", "deliveryFee", "minOrder", "isOpen"];
    const data: any = {};

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) data[field] = req.body[field];
    }

    if (data.lat !== undefined && data.lat !== null && data.lat !== "") data.lat = Number(data.lat);
    if (data.lng !== undefined && data.lng !== null && data.lng !== "") data.lng = Number(data.lng);
    if (data.deliveryRadius !== undefined) data.deliveryRadius = Number(data.deliveryRadius);
    if (data.deliveryFee !== undefined) data.deliveryFee = Number(data.deliveryFee);
    if (data.minOrder !== undefined) data.minOrder = Number(data.minOrder);
    if (data.categories !== undefined && !Array.isArray(data.categories)) data.categories = [];

    const updatedStore = await prisma.store.update({ where: { id: store.id }, data });
    res.json({ store: updatedStore });
};

export const getAdminStores = async (req: Request, res: Response) => {
    const stores = await prisma.store.findMany({
        include: {
            owner: { select: { id: true, name: true, email: true, phone: true, role: true } },
            _count: { select: { products: true, orders: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    res.json({ stores });
};

export const getAdminStore = async (req: Request, res: Response) => {
    const store = await prisma.store.findUnique({
        where: { id: req.params.id },
        include: {
            owner: { select: { id: true, name: true, email: true, phone: true, role: true } },
            products: { orderBy: { createdAt: "desc" } },
            orders: { orderBy: { createdAt: "desc" }, take: 20 },
            _count: { select: { products: true, orders: true } },
        },
    });

    if (!store) return res.status(404).json({ message: "Store not found" });
    res.json({ store });
};

export const updateAdminStore = async (req: Request, res: Response) => {
    const allowedFields = ["name", "description", "phone", "email", "logo", "coverImage", "address", "city", "state", "zip", "lat", "lng", "categories", "status", "isOpen", "deliveryRadius", "deliveryFee", "minOrder", "commissionRate"];
    const data: any = {};

    for (const field of allowedFields) {
        if (req.body[field] !== undefined) data[field] = req.body[field];
    }

    const store = await prisma.store.update({ where: { id: req.params.id }, data });
    res.json({ store });
};

export const approveStore = async (req: Request, res: Response) => {
    const store = await prisma.store.update({ where: { id: req.params.id }, data: { status: StoreStatus.APPROVED } });
    res.json({ store });
};

export const suspendStore = async (req: Request, res: Response) => {
    const store = await prisma.store.update({ where: { id: req.params.id }, data: { status: StoreStatus.SUSPENDED } });
    res.json({ store });
};
