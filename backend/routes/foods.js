import { Router } from "express";
import { createFood, getFoodById, listFoods } from "../controllers/foodsController.js";

const router = Router();

router.get("/", listFoods);
router.get("/:id", getFoodById);
router.post("/", createFood);

export default router;
