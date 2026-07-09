import express from "express";
import { signup, login, checkAuth, updateProfile } from "../controller/UserController.js";
import { protectRoute } from "../middleware/auth.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";

const userRouter = express.Router();

// Rate limit signup and login to 5 requests per 5 minutes per user/IP
userRouter.post("/signup", aiRateLimiter(5, 300000), signup);
userRouter.post("/login", aiRateLimiter(5, 300000), login);
userRouter.post("/update-profile", protectRoute, updateProfile);
userRouter.get("/check", protectRoute, checkAuth);

export default userRouter;