import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { UserRole } from "../generated/prisma/enums.js";

const getAdminStatus = (email: string | null | undefined): boolean => {
    if (!email) return false;
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()) : [];
    return adminEmails.includes(email.toLowerCase());
};

const admin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isAdminEmail = getAdminStatus(user.email);
        const isAdminRole = user.role === UserRole.ADMIN;

        if (isAdminEmail && !isAdminRole) {
            await prisma.user.update({ where: { id: user.id }, data: { role: UserRole.ADMIN } });
        }

        if (isAdminEmail || isAdminRole) {
            if (req.user) {
                req.user.isAdmin = true;
                req.user.role = UserRole.ADMIN;
            }
            return next();
        }

        res.status(403).json({ message: "Admin access required" });
    } catch (error: any) {
        console.log(error);
        res.status(500).json({ message: "Admin verification failed", error: error.message });
    }
};

export default admin;
