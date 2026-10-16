// Wrapper cho async controller để tự động chuyển lỗi sang next().
// Dùng: export const foo = asyncHandler(async (req, res) => { ... })
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
