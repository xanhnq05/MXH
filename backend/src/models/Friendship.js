// Friendship — quan hệ giữa 2 user. status: pending/accepted/blocked (dùng chung schema).
// Khi accept → 2 bên tạo document khác nhau?  → KHÔNG, chỉ 1 document.
// requester = người gửi, recipient = người nhận. Nếu accept → status = accepted.
// Khi un-friend → xoá document.

import mongoose from "mongoose";

const friendshipSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Không cho tạo 2 friendship trùng cặp
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });
friendshipSchema.index({ recipient: 1, status: 1 });

export default mongoose.model("Friendship", friendshipSchema);
