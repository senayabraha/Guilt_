import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { UserRole } from "../generated/prisma/enums.js";

const auth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided, authorization denied" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role?: UserRole };

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, email: true, role: true },
        });

        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        req.user = { id: user.id, email: user.email, role: user.role, isAdmin: user.role === UserRole.ADMIN };
        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({ message: "Token is not valid" });
    }
};

export default auth;
