// Block guard — check quan hệ chặn 1 chiều giữa 2 user.
// Có 2 chiều cần xét:
//  - me chặn target  → me không muốn tương tác (nhưng thường không cần chặn ngược)
//  - target chặn me  → me bị chặn, không được tương tác với target
// Mặc định: chỉ chặn nếu target đã chặn me (mình là người bị chặn).
// Một số API cần strict cả 2 chiều → truyền `strict: true`.

import Block from "../models/Block.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * @param {string} meId
 * @param {string} targetId
 * @param {{ strict?: boolean }} [opts]
 *   - strict=false (mặc định): chỉ 403 nếu target đã chặn me
 *   - strict=true: 403 nếu 1 trong 2 chiều bị chặn
 */
export async function assertNotBlocked(meId, targetId, opts = {}) {
  if (!meId || !targetId || meId.toString() === targetId.toString()) return;
  const filter = opts.strict
    ? {
        $or: [
          { blocker: meId, blocked: targetId },
          { blocker: targetId, blocked: meId },
        ],
      }
    : { blocker: targetId, blocked: meId };

  const blocked = await Block.findOne(filter).lean();
  if (blocked) {
    throw new ApiError(403, "Bạn không thể tương tác với người dùng này");
  }
}
