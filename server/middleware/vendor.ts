import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { UserRole } from "../generated/prisma/enums.js";

export const loadCurrentUserStores = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { stores: true },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        req.user = {
            ...req.user,
            email: user.email,
            role: user.role,
            isAdmin: user.role === UserRole.ADMIN,
            stores: user.stores,
        };

        next();
    } catch (error: any) {
        res.status(500).json({ message: "Could not load user store data", error: error.message });
    }
};

export const requireVendor = async (req: Request, res: Response, next: NextFunction) => {
    await loadCurrentUserStores(req, res, () => {
        if (req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.VENDOR) {
            return next();
        }

        return res.status(403).json({ message: "Vendor access required" });
    });
};

export const requireAdminOrVendor = async (req: Request, res: Response, next: NextFunction) => {
    await loadCurrentUserStores(req, res, () => {
        if (req.user?.role === UserRole.ADMIN || req.user?.role === UserRole.VENDOR) {
            return next();
        }

        return res.status(403).json({ message: "Admin or vendor access required" });
    });
};

export const getPrimaryStore = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        await loadCurrentUserStores(req, res, () => {
            const store = req.user?.stores?.[0];

            if (!store) {
                return res.status(404).json({ message: "No store found for this vendor" });
            }

            (req as any).store = store;
            next();
        });
    };
};
