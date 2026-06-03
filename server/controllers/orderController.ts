import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { inngest } from "../inngest/index.js";
import { StoreStatus } from "../generated/prisma/enums.js";
import Stripe from "stripe";

// Store fields exposed to customers for pickup / store info
const orderStoreSelect = {
    id: true,
    name: true,
    logo: true,
    phone: true,
    address: true,
    city: true,
    state: true,
    lat: true,
    lng: true,
};

// Create order
// POST /api/orders
export const createOrder = async (req: Request, res: Response) => {
    const { items, shippingAddress, paymentMethod } = req.body;

    // Check if order items are empty
    if (!items || items.length === 0) {
        return res.status(400).json({ message: "No order items" });
    }

    // Look up actual prices from the database, including the owning store
    const productIds = items.map((i: any) => i.product);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { store: true },
    });
    const productMap: Record<string, (typeof products)[0]> = {};

    products.forEach((p: any) => (productMap[p.id] = p));

    // Validate every cart item exists, is active, and is in stock
    for (const item of items) {
        const product = productMap[item.product];
        if (!product) {
            return res.status(404).json({ message: "One or more products no longer exist" });
        }
        if (!product.isActive) {
            return res.status(400).json({ message: `${product.name} is no longer available` });
        }
        if ((product.stock ?? 0) < item.quantity) {
            return res.status(400).json({ message: `${product.name} is out of stock` });
        }
        // Vendor products must belong to an approved and open store
        if (product.storeId) {
            if (!product.store || product.store.status !== StoreStatus.APPROVED || !product.store.isOpen) {
                return res.status(400).json({ message: `${product.name}'s store is not accepting orders right now` });
            }
        }
    }

    // Enforce one-store cart only (platform products have storeId null)
    const storeIds = Array.from(new Set(items.map((i: any) => productMap[i.product]?.storeId ?? null)));
    if (storeIds.length > 1) {
        return res.status(400).json({ message: "Please checkout items from one store at a time." });
    }
    const orderStoreId = (storeIds[0] as string | null) ?? null;
    const orderStore = orderStoreId ? productMap[items[0].product]?.store : null;

    const orderItems = items.map((item: any) => {
        const dbProduct = productMap[item.product];
        if (!dbProduct) throw new Error(`Product ${item.product} not found`);
        return {
            product: dbProduct.id,
            name: dbProduct.name,
            image: dbProduct.image,
            price: dbProduct.price,
            quantity: item.quantity,
            unit: dbProduct.unit,
        };
    });

    const subtotal = orderItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    // Store orders use the store's configured delivery fee; legacy platform orders
    // keep the free-over-$20 incentive.
    const deliveryFee = orderStore ? (orderStore.deliveryFee ?? 1.99) : subtotal > 20 ? 0 : 1.99;
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const total = Math.round((subtotal + deliveryFee + tax) * 100) / 100;

    const order = await prisma.order.create({
        data: {
            userId: req.user!.id,
            storeId: orderStoreId,
            items: orderItems,
            shippingAddress,
            paymentMethod,
            subtotal,
            deliveryFee,
            tax,
            total,
            statusHistory: [{ status: "Placed", note: "Order placed successfully", timestamp: new Date() }],
        },
    });

    if (paymentMethod === "card") {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

        // create session
        const session = await stripe.checkout.sessions.create({
            success_url: `${req.headers.origin}/orders?clearCart=true`,
            cancel_url: `${req.headers.origin}/checkout`,
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "Payment Groceries",
                        },
                        unit_amount: Math.round(total * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            metadata: { orderId: order.id },
        });
        return res.json({ url: session.url });
    }

    res.json({ order });

    // Decrease stock
    for (const item of orderItems) {
        await prisma.product.update({
            where: { id: item.product },
            data: { stock: { decrement: item.quantity } },
        });
    }

    // Send stock update events for each product in the order
    for (const item of orderItems) {
        await inngest.send({ name: "inventory/stock.updated", data: { productId: item.product } });
    }

    await inngest.send({ name: "order/placed", data: { orderId: order.id } });
};

// Get user's orders
// GET /api/orders
export const getUserOrders = async (req: Request, res: Response) => {
    const { status } = req.query;

    const where: any = {
        userId: req.user!.id,
        NOT: [{ paymentMethod: "card", isPaid: false }],
    };

    if (status && status !== "all") {
        where.status = status;
    }

    const orders = await prisma.order.findMany({
        where,
        include: {
            deliveryPartner: { select: { name: true, phone: true } },
            store: { select: orderStoreSelect },
        },
        orderBy: { createdAt: "desc" },
    });

    res.json({ orders });
};

// Get single order
// GET /api/orders/:id
export const getOrder = async (req: Request, res: Response) => {
    const order = await prisma.order.findFirst({
        where: { id: req.params.id as string, userId: req.user!.id },
        include: {
            deliveryPartner: { select: { name: true, phone: true, avatar: true, vehicleType: true } },
            store: { select: orderStoreSelect },
        },
    });

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }
    res.json({ order });
};

// Update order status (admin)
// PUT /api/orders/:id/status
export const updateOrderStatus = async (req: Request, res: Response) => {
    const { status, note } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id as string } });

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }

    const history = (Array.isArray(order.statusHistory) ? order.statusHistory : []) as any[];
    history.push({ status, note: note || `Order ${status.toLowerCase()}`, timestamp: new Date() });

    const updatedOrder = await prisma.order.update({
        where: { id: req.params.id as string },
        data: { status, statusHistory: history },
    });

    res.json({ order: updatedOrder });
};

// Get all orders (admin)
// GET /api/orders/all
export const getAllOrders = async (req: Request, res: Response) => {
    const orders = await prisma.order.findMany({
        where: { NOT: [{ paymentMethod: "card", isPaid: false }] },
        include: {
            user: { select: { name: true, email: true } },
            deliveryPartner: { select: { name: true, phone: true, email: true } },
            store: { select: orderStoreSelect },
        },
        orderBy: { createdAt: "desc" },
    });

    res.json({ orders });
};

// Get Order Location
// GET /api/orders/:id/location
export const getOrderLocation = async (req: Request, res: Response) => {
    const order = await prisma.order.findFirst({
        where: { id: req.params.id as string, userId: req.user!.id },
        select: { liveLocation: true, status: true },
    });

    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ liveLocation: order.liveLocation, status: order.status });
};
