import express from "express";
import auth from "../middleware/auth.js";
import { requireVendor } from "../middleware/vendor.js";
import { createVendorProduct, deleteVendorProduct, getVendorProducts, updateVendorProduct } from "../controllers/productController.js";
import { getVendorOrder, getVendorOrders, updateVendorOrderStatus } from "../controllers/vendorOrderController.js";
import { getVendorStore, updateVendorStore } from "../controllers/storeController.js";

const vendorRouter = express.Router();

vendorRouter.get("/store", auth, requireVendor, getVendorStore);
vendorRouter.put("/store", auth, requireVendor, updateVendorStore);

vendorRouter.get("/products", auth, requireVendor, getVendorProducts);
vendorRouter.post("/products", auth, requireVendor, createVendorProduct);
vendorRouter.put("/products/:id", auth, requireVendor, updateVendorProduct);
vendorRouter.delete("/products/:id", auth, requireVendor, deleteVendorProduct);

vendorRouter.get("/orders", auth, requireVendor, getVendorOrders);
vendorRouter.get("/orders/:id", auth, requireVendor, getVendorOrder);
vendorRouter.put("/orders/:id/status", auth, requireVendor, updateVendorOrderStatus);

export default vendorRouter;
