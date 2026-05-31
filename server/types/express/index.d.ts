import { User, DeliveryPartner, Store } from "../../generated/prisma/client.ts";

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                isAdmin?: boolean;
                role?: string;
            };
            partner?: DeliveryPartner;
            store?: Store;
        }
    }
}

export {};
