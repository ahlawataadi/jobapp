import { Router } from "express";
import { listPublishedBlogs, getBlogBySlug } from "../controllers/blogController.js";

const router = Router();

// Public blog endpoints
router.get("/", listPublishedBlogs);
router.get("/:slug", getBlogBySlug);

export default router;
