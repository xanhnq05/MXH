// Admin middleware — kiểm tra user có trong admin allowlist hay không.
// Cấu hình qua env:
//   - ADMIN_EMAILS: CSV email được phép (vd: "a@x.com,b@y.com")
//   - ADMIN_USER_IDS: CSV userId (ObjectId) được phép
// Nếu cả 2 rỗng → default deny (tất cả user không phải admin đều bị chặn 403).
// KHÔNG tin tưởng client gửi role.

import { env } from "../configs/env.config.js";

const parseList = (s) =>
  (s || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

const getAdminEmails = () => parseList(env.ADMIN_EMAILS || process.env.ADMIN_EMAILS);
const getAdminIds = () => parseList(env.ADMIN_USER_IDS || process.env.ADMIN_USER_IDS);

/** Trả về true nếu user là admin */
export const isAdmin = (user) => {
  if (!user) return false;
  const emails = getAdminEmails();
  const ids = getAdminIds();
  if (emails.length === 0 && ids.length === 0) {
    // default deny nếu không cấu hình
    return false;
  }
  const userEmail = (user.email || "").toLowerCase();
  const userId = (user._id || user.id || "").toString();
  if (emails.length && userEmail && emails.includes(userEmail)) return true;
  if (ids.length && userId && ids.includes(userId)) return true;
  return false;
};

/** Middleware: yêu cầu quyền admin */
export const adminOnly = (req, res, next) => {
  if (!isAdmin(req.user)) {
    return res
      .status(403)
      .json({ message: "Bạn không có quyền truy cập chức năng quản trị" });
  }
  next();
};
