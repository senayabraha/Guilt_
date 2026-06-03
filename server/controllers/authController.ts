import { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserRole } from "../generated/prisma/enums.js";

// Generate JWT token
const generateToken = (id: string, role: UserRole) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET as string, { expiresIn: "30d" });
};

// Check if user is admin
const getAdminStatus = (email: string | null | undefined): boolean => {
    if (!email) return false;
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()) : [];
    return adminEmails.includes(email.toLowerCase());
};

const getSafeRole = (email: string, requestedRole?: string): UserRole => {
    if (getAdminStatus(email)) return UserRole.ADMIN;
    if (requestedRole === UserRole.VENDOR) return UserRole.VENDOR;
    return UserRole.CUSTOMER;
};

const sanitizeUser = (user: any) => {
    const userData: any = { ...user };
    delete userData.password;
    userData.isAdmin = userData.role === UserRole.ADMIN || getAdminStatus(userData.email);
    return userData;
};

// Register
// POST /api/auth/register
export const register = async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Please provide all fields" });
    }

    if (role && ![UserRole.CUSTOMER, UserRole.VENDOR].includes(role)) {
        return res.status(400).json({ message: "Invalid role for public registration" });
    }

    const normalizedEmail = email.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const safeRole = getSafeRole(normalizedEmail, role);

    const user = await prisma.user.create({
        data: { name, email: normalizedEmail, password: hashedPassword, role: safeRole },
        include: { addresses: true, stores: true },
    });

    const token = generateToken(user.id, user.role);

    res.status(201).json({ user: sanitizeUser(user), token });
};

// Login
// POST /api/auth/login
export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Please provide email and password" });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, include: { addresses: true, stores: true } });

    if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    const shouldBeAdmin = getAdminStatus(user.email);
    const userWithRole = shouldBeAdmin && user.role !== UserRole.ADMIN
        ? await prisma.user.update({ where: { id: user.id }, data: { role: UserRole.ADMIN }, include: { addresses: true, stores: true } })
        : user;

    const token = generateToken(userWithRole.id, userWithRole.role);

    res.json({ user: sanitizeUser(userWithRole), token });
};
