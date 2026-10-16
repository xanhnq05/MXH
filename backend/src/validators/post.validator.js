import { z } from "zod";

export const createPostSchema = z.object({
  content: z.string().max(5000).optional(),
  visibility: z.enum(["public", "friends", "private"]).default("public"),
  tags: z
    .union([z.array(z.string().max(30)), z.string()])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        const s = val.trim();
        if (!s) return [];
        if (s.startsWith("[")) {
          try {
            const parsed = JSON.parse(s);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return s.split(",").map((t) => t.trim());
          }
        }
        return s.split(",").map((t) => t.trim());
      }
      return [];
    }),
});

export const updatePostSchema = z.object({
  content: z.string().max(5000).optional(),
  visibility: z.enum(["public", "friends", "private"]).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

// Comment mới: 1 loại nội dung — text (max 500) XOR sticker XOR gif.
// Mỗi bình luận chỉ chứa đúng 1 loại.
export const createCommentSchema = z
  .object({
    content: z.string().max(500, "Bình luận tối đa 500 ký tự").optional(),
    type: z.enum(["text", "sticker", "gif"]).default("text"),
    stickerId: z.string().max(200).optional(),
    stickerUrl: z.string().url().max(1000).optional(),
    gifId: z.string().max(200).optional(),
    gifUrl: z.string().url().max(1000).optional(),
    parentId: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    // 1) Đúng 1 loại nội dung: nếu type=text, không được có sticker/gif fields (và ngược lại)
    const hasText = !!(v.content && v.content.trim().length > 0);
    const hasSticker = !!(v.stickerId && v.stickerUrl);
    const hasGif = !!(v.gifId && v.gifUrl);
    if (v.type === "text") {
      if (!hasText) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bình luận text phải có nội dung",
          path: ["content"],
        });
      }
      if (hasSticker || hasGif || v.stickerId || v.stickerUrl || v.gifId || v.gifUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Không thể gửi kèm sticker hoặc GIF cùng lúc với text",
        });
      }
    } else if (v.type === "sticker") {
      if (!hasSticker) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bình luận sticker cần stickerId và stickerUrl",
        });
      }
      if (hasText || hasGif || v.content || v.gifId || v.gifUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bình luận sticker không được chứa nội dung khác",
        });
      }
    } else if (v.type === "gif") {
      if (!hasGif) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bình luận gif cần gifId và gifUrl",
        });
      }
      if (hasText || hasSticker || v.content || v.stickerId || v.stickerUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bình luận gif không được chứa nội dung khác",
        });
      }
    }
  });

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(500, "Bình luận tối đa 500 ký tự"),
});
