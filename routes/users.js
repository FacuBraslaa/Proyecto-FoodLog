import { Router } from "express";
import { createUser, getUserById, listUsers } from "../controllers/usersController.js";

const router = Router();

router.get("/", listUsers);
router.get("/:id", getUserById);
router.post("/", createUser);

export default router;
