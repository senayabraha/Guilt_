import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";

const allowedVendorStatuses = ["Confirmed", "Packed", "Ready for Pickup", "Cancelled"];

const storeSelect = {
    id: true,
    name: true,
    logo: true,
    phone: true,
    address: true,
    city: true,
    state: true,
    zip: true,
    lat: true,
    lng: true,
};

const getVendorStore = async (userId: string) => {
    return prisma.store.findFirst({ where: { ownerId: userId } });
};

const buildHistory = (currentHistory: any, status: string, note?: string) => {
    const history = Array.isArray(currentHistory) ? currentHistory : [];
    return [...history, { status, note: note || `Order ${status.toLowerCase()}`, timestamp: new Date() }];
};

export const getVendorOrders = async (req: Request, res: Response) => {
    const store = await getVendorStore(req.user!.id);
    if (!store) return res.status(404).json({ message: "No store found for this vendor" });

    const { status } = req.query;
    const where: any = { storeId: store.id, NOT: [{ paymentMethod: "card", isPaid: false }] };
    if (status && status !== "all") where.status = status;

    const orders = await prisma.order.findMany({
        where,
        include: {
            user: { select: { name: true, email: true, phone: true } },
            deliveryPartner: { select: { name: true, phone: true } },
            store: { select: storeSelect },
        },
        orderBy: { createdAt: "desc" },
    });

    res.json({ orders, store });
};

export const getVendorOrder = async (req: Request, res: Response) => {
    const store = await getVendorStore(req.user!.id);
    if (!store) return res.status(404).json({ message: "No store found for this vendor" });

    const order = await prisma.order.findFirst({
        where: { id: req.params.id as string, storeId: store.id },
        include: {
            user: { select: { name: true, email: true, phone: true } },
            deliveryPartner: { select: { name: true, phone: true } },
            store: { select: storeSelect },
        },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
};

export const updateVendorOrderStatus = async (req: Request, res: Response) => {
    const { status, note } = req.body;
    if (!allowedVendorStatuses.includes(status)) {
        return res.status(400).json({ message: "Vendor can only set status to Confirmed, Packed, Ready for Pickup, or Cancelled" });
    }

    const store = await getVendorStore(req.user!.id);
    if (!store) return res.status(404).json({ message: "No store found for this vendor" });

    const order = await prisma.order.findFirst({ where: { id: req.params.id as string, storeId: store.id } });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: { status, statusHistory: buildHistory(order.statusHistory, status, note) },
        include: {
            user: { select: { name: true, email: true, phone: true } },
            deliveryPartner: { select: { name: true, phone: true } },
            store: { select: storeSelect },
        },
    });

    res.json({ order: updatedOrder });
};
