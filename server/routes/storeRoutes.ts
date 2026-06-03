import express from "express";
import auth from "../middleware/auth.js";
import admin from "../middleware/admin.js";
import { requireVendor } from "../middleware/vendor.js";
import {
    applyForStore,
    approveStore,
    getAdminStore,
    getAdminStores,
    getPublicStore,
    getPublicStoreProducts,
    getPublicStores,
    getVendorStore,
    suspendStore,
    updateAdminStore,
    updateVendorStore,
} from "../controllers/storeController.js";

const storeRouter = express.Router();

storeRouter.get("/", getPublicStores);
storeRouter.get("/:id", getPublicStore);
storeRouter.get("/:id/products", getPublicStoreProducts);

storeRouter.post("/apply", auth, applyForStore);

export const vendorStoreRouter = express.Router();
vendorStoreRouter.get("/store", auth, requireVendor, getVendorStore);
vendorStoreRouter.put("/store", auth, requireVendor, updateVendorStore);

export const adminStoreRouter = express.Router();
adminStoreRouter.get("/stores", auth, admin, getAdminStores);
adminStoreRouter.get("/stores/:id", auth, admin, getAdminStore);
adminStoreRouter.put("/stores/:id", auth, admin, updateAdminStore);
adminStoreRouter.put("/stores/:id/approve", auth, admin, approveStore);
adminStoreRouter.put("/stores/:id/suspend", auth, admin, suspendStore);

export default storeRouter;
