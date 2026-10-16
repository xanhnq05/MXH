import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ");

export const createDirectSchema = z.object({
  userId: objectId,
});

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  memberIds: z.array(objectId).default([]),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  avatarId: z.string().optional(),
});

export const addMembersSchema = z.object({
  memberIds: z.array(objectId).min(1),
});

export const changeRoleSchema = z.object({
  userId: objectId,
  newRole: z.enum(["admin", "member"]), // owner phai qua transferOwnership
});

export const transferOwnershipSchema = z.object({
  userId: objectId,
});

export const setNicknameSchema = z.object({
  nickname: z.string().max(40).nullable(),
});

export const muteSchema = z.object({
  mute: z.boolean(),
});

export const sendMessageSchema = z.object({
  type: z
    .enum(["text", "image", "file", "voice", "sticker", "gif", "share_post"])
    .default("text"),
  content: z.string().max(5000).optional(),
  fileUrl: z.string().optional(),
  fileKey: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  duration: z.number().optional(),
  stickerId: z.string().optional(),
  stickerUrl: z.string().optional(),
  replyTo: z.string().optional(),
  isEncrypted: z.boolean().optional(),
  iv: z.string().optional(),
  authTag: z.string().optional(),
  encryptedKeys: z
    .array(
      z.object({
        userId: objectId,
        encryptedKey: z.string(),
      })
    )
    .optional(),
});

export const markReadSchema = z.object({
  lastMessageId: objectId,
});

export const pinSchema = z.object({
  messageId: objectId,
});
