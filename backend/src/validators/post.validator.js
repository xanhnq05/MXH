import { z } from "zod";

export const createPostSchema = z.object({
  content: z.string().max(5000).optional(),
  visibility: z.enum(["public", "friends", "private"]).default("public"),
});

export const updatePostSchema = z.object({
  content: z.string().max(5000).optional(),
  visibility: z.enum(["public", "friends", "private"]).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});
