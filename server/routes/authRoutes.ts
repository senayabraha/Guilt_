import express from "express";
import { login, register, registerVendor } from "../controllers/authController.js";

const authRouter = express.Router();

authRouter.post("/register", register);
authRouter.post("/register-vendor", registerVendor);
authRouter.post("/login", login);

export default authRouter;
