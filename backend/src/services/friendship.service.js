// Friendship service — gửi lời mời, chấp nhận, từ chối, hủy kết bạn.

import mongoose from "mongoose";
import Friendship from "../models/Friendship.js";
import Block from "../models/Block.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { ApiError } from "../utils/ApiError.js";
import { emitToUser } from "../libs/socket.js";
import { notificationService } from "./notification.service.js";

const areBlocked = async (a, b) => {
  const found = await Block.findOne({
    $or: [
      { blocker: a, blocked: b },
      { blocker: b, blocked: a },
    ],
  });
  return !!found;
};

const areAlreadyFriends = async (a, b) => {
  return Friendship.findOne({
    $or: [
      { requester: a, recipient: b, status: "accepted" },
      { requester: b, recipient: a, status: "accepted" },
    ],
  });
};

export const friendshipService = {
  /** Gửi lời mời kết bạn */
  async sendRequest(meId, recipientId) {
    if (meId.toString() === recipientId.toString())
      throw new ApiError(400, "Không thể gửi lời mời cho chính mình");
    if (await areBlocked(meId, recipientId))
      throw new ApiError(403, "Không thể gửi lời mời");

    const recipient = await User.findById(recipientId);
    if (!recipient) throw new ApiError(404, "Người dùng không tồn tại");

    if (await areAlreadyFriends(meId, recipientId))
      throw new ApiError(409, "Đã là bạn bè");

    // Có thể lời mời ngược chiều tồn tại → auto-accept
    const reverse = await Friendship.findOne({
      requester: recipientId,
      recipient: meId,
      status: "pending",
    });
    if (reverse) {
      reverse.status = "accepted";
      await reverse.save();
      await notificationService.push({
        recipientId: recipientId,
        senderId: meId,
        type: "friend_accept",
        refId: meId,
      });
      return { autoAccepted: true, friendship: reverse };
    }

    // Tránh trùng pending
    const existing = await Friendship.findOne({
      $or: [
        { requester: meId, recipient: recipientId, status: "pending" },
        { requester: recipientId, recipient: meId, status: "pending" },
      ],
    });
    if (existing) throw new ApiError(409, "Đã có lời mời trước đó");

    const friendship = await Friendship.create({
      requester: meId,
      recipient: recipientId,
    });

    await notificationService.push({
      recipientId,
      senderId: meId,
      type: "friend_request",
      refId: meId,
    });

    return { friendship };
  },

  async acceptRequest(meId, requesterId) {
    const f = await Friendship.findOneAndUpdate(
      {
        requester: requesterId,
        recipient: meId,
        status: "pending",
      },
      { status: "accepted" },
      { new: true }
    );
    if (!f) {
      // Thử tìm ngược: nếu đã accepted rồi thì vẫn thành công
      const existing = await Friendship.findOne({
        $or: [
          { requester: meId, recipient: requesterId },
          { requester: requesterId, recipient: meId },
        ],
        status: "accepted",
      });
      if (existing) return existing;
      throw new ApiError(404, "Không tìm thấy lời mời kết bạn");
    }
    await notificationService.push({
      recipientId: requesterId,
      senderId: meId,
      type: "friend_accept",
      refId: meId,
    });
    return f;
  },

  async rejectRequest(meId, requesterId) {
    const f = await Friendship.findOneAndDelete({
      requester: requesterId,
      recipient: meId,
      status: "pending",
    });
    if (!f) throw new ApiError(404, "Không tìm thấy lời mời");
    return { success: true };
  },

  async cancelRequest(meId, recipientId) {
    const f = await Friendship.findOneAndDelete({
      requester: meId,
      recipient: recipientId,
      status: "pending",
    });
    if (!f) throw new ApiError(404, "Không tìm thấy lời mời đã gửi");
    return { success: true };
  },

  async unfriend(meId, otherId) {
    const f = await Friendship.findOneAndDelete({
      $or: [
        { requester: meId, recipient: otherId, status: "accepted" },
        { requester: otherId, recipient: meId, status: "accepted" },
      ],
    });
    if (!f) throw new ApiError(404, "Không tìm thấy quan hệ bạn bè");
    return { success: true };
  },

  async listFriends(meId) {
    const list = await Friendship.find({
      $or: [{ requester: meId }, { recipient: meId }],
      status: "accepted",
    })
      .populate("requester", "username displayName avatarUrl")
      .populate("recipient", "username displayName avatarUrl");

    return list.map((f) => {
      const other =
        f.requester._id.toString() === meId.toString()
          ? f.recipient
          : f.requester;
      return {
        friendshipId: f._id,
        friend: other,
        since: f.updatedAt,
      };
    });
  },

  async listIncoming(meId) {
    return Friendship.find({ recipient: meId, status: "pending" })
      .populate("requester", "username displayName avatarUrl")
      .sort({ createdAt: -1 });
  },

  async listSent(meId) {
    return Friendship.find({ requester: meId, status: "pending" })
      .populate("recipient", "username displayName avatarUrl")
      .sort({ createdAt: -1 });
  },

  /**
   * Gợi ý bạn bè:
   * - Bạn của bạn bè (friend of friend) — độ ưu tiên cao
   * - Người cùng quốc gia (nếu có country) — độ ưu tiên trung bình
   * - Loại trừ: chính mình, bạn bè hiện tại, đã pending, đã block
   * Mỗi suggestion kèm reason để client hiển thị
   */
  async listSuggestions(meId, limit = 20) {
    const meIdStr = new mongoose.Types.ObjectId(meId);

    // 1) Lấy danh sách bạn bè hiện tại
    const myFriendships = await Friendship.find({
      $or: [{ requester: meIdStr }, { recipient: meIdStr }],
      status: "accepted",
    }).lean();
    const myFriendIds = myFriendships.map((f) =>
      f.requester.toString() === meId.toString() ? f.recipient : f.requester
    );

    // 2) Lấy danh sách pending (incoming + sent)
    const pendings = await Friendship.find({
      $or: [
        { requester: meIdStr, status: "pending" },
        { recipient: meIdStr, status: "pending" },
      ],
    }).lean();
    const pendingIds = pendings.map((f) =>
      f.requester.toString() === meId.toString() ? f.recipient : f.requester
    );

    // 3) Lấy danh sách block
    const blocks = await Block.find({ blocker: meIdStr }).lean();
    const blockedIds = blocks.map((b) => b.blocked);

    // 4) Friend-of-friend: bạn của bạn bè
    const friendOfFriendMap = new Map(); // userId -> Set<sourceFriendId>
    if (myFriendIds.length > 0) {
      const fofRaw = await Friendship.find({
        $or: [
          { requester: { $in: myFriendIds }, status: "accepted" },
          { recipient: { $in: myFriendIds }, status: "accepted" },
        ],
      }).lean();
      for (const f of fofRaw) {
        // Bỏ qua nếu 1 trong 2 phía là chính mình
        const a = f.requester.toString();
        const b = f.recipient.toString();
        if (a === meId.toString() || b === meId.toString()) continue;
        const otherId = a === meId.toString() ? b : (b === meId.toString() ? a : null);
        if (!otherId) {
          // Cả 2 đều là bạn của mình → friend-of-friend thật sự
          const candidateA = a;
          const candidateB = b;
          for (const [cand, src] of [
            [candidateA, candidateB],
            [candidateB, candidateA],
          ]) {
            if (cand === meId.toString()) continue;
            if (!friendOfFriendMap.has(cand)) friendOfFriendMap.set(cand, new Set());
            friendOfFriendMap.get(cand).add(src);
          }
        }
      }
    }

    // 5) Loại bỏ các id không hợp lệ
    const exclude = new Set([
      meId.toString(),
      ...myFriendIds.map(String),
      ...pendingIds.map(String),
      ...blockedIds.map(String),
    ]);
    for (const id of friendOfFriendMap.keys()) {
      if (exclude.has(id)) friendOfFriendMap.delete(id);
    }

    // 6) Lấy thông tin user cho các candidate
    const fofUserIds = Array.from(friendOfFriendMap.keys());
    let fofUsers = [];
    if (fofUserIds.length > 0) {
      fofUsers = await User.find({ _id: { $in: fofUserIds } })
        .select("username displayName avatarUrl isOnline country city school workplace mutualFriends")
        .lean();
    }

    // 7) Random một số user mới (nếu chưa đủ) — mặc định lấy thêm từ User khác
    let needMore = Math.max(0, limit - fofUsers.length);
    let randomUsers = [];
    if (needMore > 0) {
      randomUsers = await User.find({
        _id: { $nin: Array.from(exclude).concat(fofUserIds) },
      })
        .select("username displayName avatarUrl isOnline country city school workplace")
        .limit(needMore * 2) // lấy dư để random
        .lean();
    }

    // 8) Build kết quả với reason
    const result = [];

    for (const u of fofUsers) {
      const sources = Array.from(friendOfFriendMap.get(u._id.toString()) || []);
      const sourceUsers = await User.find({ _id: { $in: sources } })
        .select("displayName username avatarUrl")
        .lean();
      const sourceName = sourceUsers[0]?.displayName || "bạn bè";
      const count = sources.length;
      const reason = count > 1
        ? `${count} bạn chung`
        : `${sourceName} là bạn của bạn`;
      result.push({
        user: u,
        reason,
        reasonType: "mutual",
        mutualCount: count,
        sourceUsers,
      });
    }

    for (const u of randomUsers) {
      // Random chọn reason dựa trên thông tin có sẵn
      let reason = "Có thể bạn quen";
      let reasonType = "newUser";
      if (u.country) {
        reason = `Cùng quốc gia: ${u.country}`;
        reasonType = "country";
      } else if (u.city) {
        reason = `Cùng thành phố: ${u.city}`;
        reasonType = "city";
      } else if (u.school) {
        reason = `Cùng trường: ${u.school}`;
        reasonType = "school";
      } else if (u.workplace) {
        reason = `Cùng cơ quan: ${u.workplace}`;
        reasonType = "workplace";
      }
      result.push({
        user: u,
        reason,
        reasonType,
        mutualCount: 0,
        sourceUsers: [],
      });
      if (result.length >= limit + fofUsers.length) break;
    }

    // Shuffle và limit
    return result.slice(0, limit);
  },
};
