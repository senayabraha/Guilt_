import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";

// Vendor middleware — runs after `auth`. Ensures the user is a vendor and loads
// the store they own onto req.store so vendor controllers stay scoped to it.
const vendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.role !== "vendor") {
            return res.status(403).json({ message: "Vendor access required" });
        }

        // A vendor manages a single store (the one they own)
        const store = await prisma.store.findFirst({ where: { ownerId: userId } });
        if (!store) {
            return res.status(404).json({ message: "No store found for this vendor" });
        }

        if (req.user) req.user.role = user.role;
        req.store = store;
        next();
    } catch (error: any) {
        console.log(error);
        res.status(500).json({ message: "Vendor verification failed", error: error.message });
    }
};

export default vendor;
