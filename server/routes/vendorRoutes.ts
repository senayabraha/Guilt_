import express from "express";
import auth from "../middleware/auth.js";
import vendor from "../middleware/vendor.js";
import {
    getMyStore,
    updateMyStore,
    getMyProducts,
    createMyProduct,
    updateMyProduct,
    deleteMyProduct,
    getMyOrders,
    updateMyOrderStatus,
    getMyStats,
} from "../controllers/vendorController.js";

const vendorRouter = express.Router();

// Every vendor route requires a logged-in vendor who owns a store
vendorRouter.use(auth, vendor);

vendorRouter.get("/store", getMyStore);
vendorRouter.put("/store", updateMyStore);

vendorRouter.get("/stats", getMyStats);

vendorRouter.get("/products", getMyProducts);
vendorRouter.post("/products", createMyProduct);
vendorRouter.put("/products/:id", updateMyProduct);
vendorRouter.delete("/products/:id", deleteMyProduct);

vendorRouter.get("/orders", getMyOrders);
vendorRouter.put("/orders/:id/status", updateMyOrderStatus);

export default vendorRouter;
