import { Router } from "express";
import { getActiveBanner } from "../controllers/bannerController.js";

const router = Router();

router.get("/active", getActiveBanner);

export default router;
