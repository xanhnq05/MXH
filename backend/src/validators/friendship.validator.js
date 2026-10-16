import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ");

export const friendActionSchema = z.object({
  userId: objectId,
});

export const blockSchema = z.object({
  userId: objectId,
});
