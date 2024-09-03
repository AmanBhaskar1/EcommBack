import express from "express";
import orderRoute from "./routes/order.js";
import productRoute from "./routes/product.js";
import dashboardRoute from "./routes/stats.js";
import userRoute from "./routes/user.js";

import cors from "cors";
import { config } from "dotenv";
import morgan from "morgan";
import NodeCache from "node-cache";
import Stripe from "stripe";
import { errorMiddleware } from "./middlewares/error.js";
import { connectDB } from "./utils/features.js";
config({
  path: "./.env",
});
const port = process.env.PORT || 4000;
const mongoUri = process.env.MONGO_URI || "";
const stripeKey = process.env.STRIPE_KEY || "";

connectDB(mongoUri);
export const stripe = new Stripe(stripeKey);
export const myCache = new NodeCache();
const app = express();
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());
app.get("/", (req, res) => {
  res.send("working");
});
app.use("/api/v1/user", userRoute);
app.use("/api/v1/product", productRoute);
app.use("/api/v1/order", orderRoute);
app.use("/api/v1/dashboard", dashboardRoute);

app.use("/uploads", express.static("uploads"));
app.use(errorMiddleware);
app.listen(port, () => {
  console.log("Server is listening on port 3000");
});
