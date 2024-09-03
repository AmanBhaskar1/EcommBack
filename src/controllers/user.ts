import { NextFunction, Request, Response } from "express";
import { User } from "../models/user.js";
import { newUserRequestBody } from "../types/types.js";
import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";

export const newUser = TryCatch(
  async (
    req: Request<{}, {}, newUserRequestBody>,
    res: Response,
    next: NextFunction
  ) => {
    const { name, email, gender, dob, photo, _id } = req.body;
    let user = await User.findById(_id);
    if (user) {
      return res.status(200).json({
        success: true,
        message: `Welcome, ${user.name}`,
      });
    }
    if (!_id || !name || !photo || !email || !gender || !dob) {
      return next(new ErrorHandler("Please add all the fields", 400));
    }
    user = await User.create({
      name,
      email,
      gender,
      dob,
      photo,
      _id,
    });
    return res.status(201).json({
      success: true,
      message: `Welcome, ${user.name}`,
    });
  }
);
export const getAllUsers = TryCatch(async (req, res, next) => {
  const users = await User.find({});
  return res.status(200).json({
    success: true,
    users,
  });
});
export const getUser = TryCatch(async (req, res, next) => {
  const id = req.params.id;
  const user = await User.findById(id);
  if (!user) {
    return next(new ErrorHandler("Invalid ID", 400));
  }
  return res.status(200).json({
    success: true,
    user,
  });
});
export const deleteUser = TryCatch(async (req, res, next) => {
  const id = req.params.id;
  const user = await User.findById(id);
  if (!user) {
    return next(new ErrorHandler("Invalid ID", 400));
  }
  await user.deleteOne();
  return res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});