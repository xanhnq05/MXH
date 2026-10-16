// Conversation — hội thoại 1-1 hoặc nhóm.
import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member",
    },
    nickname: { type: String, default: null, maxlength: 40 }, // biệt danh trong nhóm
    joinedAt: { type: Date, default: Date.now },
    lastReadMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "group"],
      required: true,
    },
    name: { type: String, maxlength: 100 }, // chỉ group
    avatarUrl: { type: String },
    avatarId: { type: String },
    members: { type: [memberSchema], required: true },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    lastMessageAt: { type: Date, default: Date.now },
    pinnedMessages: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    ],
    // Map userId → true nếu user đó mute thông báo
    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // ===== Nhóm mở (anyone with link can join) =====
    // joinType: "open" (mở - vào qua link) | "closed" (kín - phải được mời)
    joinType: {
      type: String,
      enum: ["open", "closed"],
      default: "closed",
      index: true,
    },
    // Slug ngẫu nhiên dùng cho link mời, unique khi joinType=open
    joinLink: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ "members.userId": 1, lastMessageAt: -1 });
conversationSchema.index({ lastMessageAt: -1 });
// Unique slug cho group mở (partial index)
conversationSchema.index(
  { joinLink: 1 },
  {
    unique: true,
    partialFilterExpression: { joinType: "open", joinLink: { $type: "string" } },
  }
);

// Tính số thành viên thực sự (loại trừ những người đã rời nếu sau này mở rộng)
conversationSchema.methods.memberCount = function () {
  return this.members.length;
};

export default mongoose.model("Conversation", conversationSchema);
