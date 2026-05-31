import { prisma } from "./config/prisma.js";
import bcrypt from "bcrypt";

// Demo multi-store data for Addis Ababa. Idempotent: re-running upserts by slug.
const stores = [
    {
        name: "Shola Fresh Market",
        slug: "shola-fresh-market",
        description: "Fresh fruits, vegetables and daily groceries from Shola.",
        subCity: "Yeka",
        phone: "+251911000001",
        email: "shola@example.com",
        deliveryFee: 80,
        minOrderAmount: 300,
        taxRate: 0.15,
        owner: { name: "Shola Owner", email: "vendor.shola@example.com" },
    },
    {
        name: "Bole Mega Mart",
        slug: "bole-mega-mart",
        description: "Supermarket essentials and imported goods in Bole.",
        subCity: "Bole",
        phone: "+251911000002",
        email: "bole@example.com",
        deliveryFee: 120,
        minOrderAmount: 500,
        taxRate: 0.15,
        owner: { name: "Bole Owner", email: "vendor.bole@example.com" },
    },
    {
        name: "Merkato Grocers",
        slug: "merkato-grocers",
        description: "Pantry staples and bulk goods from Merkato.",
        subCity: "Addis Ketema",
        phone: "+251911000003",
        email: "merkato@example.com",
        deliveryFee: 60,
        minOrderAmount: 250,
        taxRate: 0.15,
        owner: { name: "Merkato Owner", email: "vendor.merkato@example.com" },
    },
];

async function main() {
    console.log("Seeding stores...");
    const defaultPassword = await bcrypt.hash("password123", 10);

    // Create/refresh the demo stores and their vendor owners
    const storeIds: string[] = [];
    for (const s of stores) {
        const owner = await prisma.user.upsert({
            where: { email: s.owner.email },
            update: { role: "vendor" },
            create: {
                name: s.owner.name,
                email: s.owner.email,
                password: defaultPassword,
                role: "vendor",
            },
        });

        const store = await prisma.store.upsert({
            where: { slug: s.slug },
            update: {
                name: s.name,
                description: s.description,
                subCity: s.subCity,
                phone: s.phone,
                email: s.email,
                deliveryFee: s.deliveryFee,
                minOrderAmount: s.minOrderAmount,
                taxRate: s.taxRate,
                isApproved: true,
                isActive: true,
                ownerId: owner.id,
            },
            create: {
                name: s.name,
                slug: s.slug,
                description: s.description,
                subCity: s.subCity,
                phone: s.phone,
                email: s.email,
                deliveryFee: s.deliveryFee,
                minOrderAmount: s.minOrderAmount,
                taxRate: s.taxRate,
                isApproved: true,
                isActive: true,
                ownerId: owner.id,
            },
        });
        storeIds.push(store.id);
        console.log(`Upserted store: ${store.name} (${store.id})`);
    }

    // Assign any products that don't yet belong to a store, distributing them
    // round-robin across the demo stores so each store has a catalog to browse.
    const orphanProducts = await prisma.product.findMany({
        where: { storeId: null },
        select: { id: true },
    });

    for (let i = 0; i < orphanProducts.length; i++) {
        const storeId = storeIds[i % storeIds.length];
        await prisma.product.update({
            where: { id: orphanProducts[i].id },
            data: { storeId },
        });
    }
    console.log(`Assigned ${orphanProducts.length} unassigned product(s) to stores.`);
    console.log("Store seeding complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
