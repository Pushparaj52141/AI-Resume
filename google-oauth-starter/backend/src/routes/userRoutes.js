import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/me", protect, async (req, res) => {
  return res.status(200).json({
    user: req.user
  });
});

export default router;
