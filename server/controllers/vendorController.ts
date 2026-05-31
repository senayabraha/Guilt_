import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

// All handlers run after `auth` + `vendor`, so req.store is the vendor's store.

// GET /api/vendor/store
export const getMyStore = async (req: Request, res: Response) => {
    res.json({ store: req.store });
};

// PUT /api/vendor/store
export const updateMyStore = async (req: Request, res: Response) => {
    const { name, description, logo, phone, email, subCity, address, lat, lng, deliveryFee, minOrderAmount, taxRate, openingHours } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (logo !== undefined) data.logo = logo;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (subCity !== undefined) data.subCity = subCity;
    if (address !== undefined) data.address = address;
    if (lat !== undefined) data.lat = lat;
    if (lng !== undefined) data.lng = lng;
    if (deliveryFee !== undefined) data.deliveryFee = deliveryFee;
    if (minOrderAmount !== undefined) data.minOrderAmount = minOrderAmount;
    if (taxRate !== undefined) data.taxRate = taxRate;
    if (openingHours !== undefined) data.openingHours = openingHours;

    const store = await prisma.store.update({ where: { id: req.store!.id }, data });
    res.json({ store });
};

// GET /api/vendor/products
export const getMyProducts = async (req: Request, res: Response) => {
    const products = await prisma.product.findMany({
        where: { storeId: req.store!.id },
        orderBy: { createdAt: "desc" },
    });
    res.json({ products });
};

// POST /api/vendor/products
export const createMyProduct = async (req: Request, res: Response) => {
    // Force the product onto the vendor's own store, ignoring any client storeId
    const product = await prisma.product.create({
        data: { ...req.body, storeId: req.store!.id },
    });
    res.status(201).json({ product });
};

// PUT /api/vendor/products/:id
export const updateMyProduct = async (req: Request, res: Response) => {
    // Ensure the product belongs to this vendor's store before updating
    const existing = await prisma.product.findFirst({
        where: { id: req.params.id as string, storeId: req.store!.id },
    });
    if (!existing) {
        return res.status(404).json({ message: "Product not found in your store" });
    }

    const data = { ...req.body };
    delete data.storeId; // never allow reassigning a product to another store

    const product = await prisma.product.update({ where: { id: existing.id }, data });
    res.json({ product });
};

// DELETE /api/vendor/products/:id  (soft delete: out of stock)
export const deleteMyProduct = async (req: Request, res: Response) => {
    const existing = await prisma.product.findFirst({
        where: { id: req.params.id as string, storeId: req.store!.id },
    });
    if (!existing) {
        return res.status(404).json({ message: "Product not found in your store" });
    }
    await prisma.product.update({ where: { id: existing.id }, data: { stock: 0 } });
    res.json({ message: "Product marked out of stock" });
};

// GET /api/vendor/orders
export const getMyOrders = async (req: Request, res: Response) => {
    const orders = await prisma.order.findMany({
        where: { storeId: req.store!.id, NOT: [{ paymentMethod: "card", isPaid: false }] },
        include: {
            user: { select: { name: true, email: true, phone: true } },
            deliveryPartner: { select: { name: true, phone: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    res.json({ orders });
};

// PUT /api/vendor/orders/:id/status
export const updateMyOrderStatus = async (req: Request, res: Response) => {
    const { status, note } = req.body;

    const order = await prisma.order.findFirst({
        where: { id: req.params.id as string, storeId: req.store!.id },
    });
    if (!order) {
        return res.status(404).json({ message: "Order not found in your store" });
    }

    const history = (Array.isArray(order.statusHistory) ? order.statusHistory : []) as any[];
    history.push({ status, note: note || `Order ${status.toLowerCase()}`, timestamp: new Date() });

    const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { status, statusHistory: history },
    });
    res.json({ order: updatedOrder });
};

// GET /api/vendor/stats
export const getMyStats = async (req: Request, res: Response) => {
    const storeId = req.store!.id;
    const [totalOrders, totalProducts, outOfStock, recentOrders] = await Promise.all([
        prisma.order.count({ where: { storeId, NOT: [{ paymentMethod: "card", isPaid: false }] } }),
        prisma.product.count({ where: { storeId } }),
        prisma.product.count({ where: { storeId, stock: 0 } }),
        prisma.order.findMany({
            where: { storeId, NOT: [{ paymentMethod: "card", isPaid: false }] },
            orderBy: { createdAt: "desc" },
            take: 8,
            include: { user: { select: { name: true, email: true } } },
        }),
    ]);
    res.json({ totalOrders, totalProducts, outOfStock, recentOrders, store: req.store });
};
