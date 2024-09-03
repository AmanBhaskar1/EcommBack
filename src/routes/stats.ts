import express from "express";
import {
  getBar,
  getDashboardStats,
  getLine,
  getPie,
} from "../controllers/stats.js";
import { adminOnly } from "../middlewares/auth.js";
const app = express.Router();
app.get("/stats", adminOnly, getDashboardStats);
app.get("/pie", adminOnly, getPie);
app.get("/bar", adminOnly, getBar);
app.get("/line", adminOnly, getLine);

export default app;
