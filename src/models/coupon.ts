import mongoose from "mongoose";
const schema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
    required: [true, "Please enter the Coupon Code"],
  },
  amount: {
    type: Number,
    required: [true, "Please enter the discount amount"],
  },
});
export const Coupon = mongoose.model("Coupon", schema);
