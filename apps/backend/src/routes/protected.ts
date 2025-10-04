import { Router } from "express";
import { requireJwt } from "../middleware/requireJwt";

const router = Router();

router.get("/secret", requireJwt, (req, res) => {
  res.json({ message: "Protected data", user: (req as any).user });
});

export default router;
