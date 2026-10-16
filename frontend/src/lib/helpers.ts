// Helpers tiện ích — kết hợp nhiều helper nhỏ.

/**
 * Kiểm tra user có phải admin hay không.
 * Căn cứ theo email hoặc _id nằm trong allowlist từ backend /api/admin endpoint
 * (admin check thực sự vẫn ở backend).
 * FE chỉ dùng để ẩn/hiện link admin cho gọn, KHÔNG thay thế backend authz.
 */
export const isAdminUser = (user: { email?: string; _id?: string } | null | undefined): boolean => {
  if (!user) return false;
  // Local heuristic: email khớp env VITE_ADMIN_EMAILS (CSV)
  const envAdmins = (import.meta as any).env?.VITE_ADMIN_EMAILS || "";
  if (!envAdmins) return false;
  const list = envAdmins
    .split(",")
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes((user.email || "").toLowerCase());
};
