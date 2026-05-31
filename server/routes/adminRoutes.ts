import express from "express";
import auth from "../middleware/auth.js";
import admin from "../middleware/admin.js";
import { approveStore, assignDeliveryPartner, createDeliveryPartner, getAdminStats, getDeliveryPartners, getStores, setStoreStatus, updateDeliveryPartner } from "../controllers/adminController.js";

const adminRouter = express.Router();

adminRouter.get("/stats", auth, admin, getAdminStats);

adminRouter.get("/stores", auth, admin, getStores);
adminRouter.put("/stores/:id/approve", auth, admin, approveStore);
adminRouter.put("/stores/:id/status", auth, admin, setStoreStatus);

adminRouter.get("/delivery-partners", auth, admin, getDeliveryPartners);
adminRouter.post("/delivery-partners", auth, admin, createDeliveryPartner);
adminRouter.put("/delivery-partners/:id", auth, admin, updateDeliveryPartner);
adminRouter.put("/orders/:id/assign", auth, admin, assignDeliveryPartner);

export default adminRouter;
