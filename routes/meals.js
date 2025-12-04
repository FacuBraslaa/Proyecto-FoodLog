import { Router } from "express";
import {
  createMeal,
  dailyTotals,
  getMealById,
  listMeals,
  updateMeal,
  deleteMeal,
} from "../controllers/mealsController.js";

const router = Router();

router.get("/", listMeals);
router.get("/daily-totals", dailyTotals);
router.get("/:id", getMealById);
router.post("/", createMeal);
router.put("/:id", updateMeal);
router.delete("/:id", deleteMeal);

export default router;
