import { Router } from "express";
import {
  createUser,
  getUserById,
  listUsers,
  loginUser,
} from "../controllers/usersController.js";

const router = Router();

router.get("/", listUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.post("/login", loginUser);

export default router;
