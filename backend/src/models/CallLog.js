// CallLog — lịch sử cuộc gọi.
import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["audio", "video"],
      required: true,
    },
    mode: { type: String, enum: ["direct", "group"], default: "direct" },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ],
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    duration: { type: Number, default: 0 }, // giây
    status: {
      type: String,
      enum: ["ongoing", "ended", "missed", "rejected", "failed"],
      default: "ongoing",
    },
  },
  { timestamps: true }
);

callLogSchema.index({ callerId: 1, startedAt: -1 });
callLogSchema.index({ participants: 1, startedAt: -1 });

export default mongoose.model("CallLog", callLogSchema);
