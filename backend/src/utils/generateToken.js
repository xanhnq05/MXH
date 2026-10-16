// Sinh access + refresh token.
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../configs/env.config.js";

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET);
};
