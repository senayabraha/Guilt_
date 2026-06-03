import { DeliveryPartner, Store, UserRole } from "../../generated/prisma/client.ts";

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email?: string;
                role?: UserRole;
                isAdmin?: boolean;
                stores?: Store[];
            };
            partner?: DeliveryPartner;
        }
    }
}

export {};
