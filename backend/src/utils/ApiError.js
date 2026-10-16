// Class lỗi chuẩn để controller ném ra, errorMiddleware sẽ chuyển thành response JSON.
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg, details) {
    return new ApiError(400, msg, details);
  }
  static unauthorized(msg = "Chưa xác thực") {
    return new ApiError(401, msg);
  }
  static forbidden(msg = "Không có quyền") {
    return new ApiError(403, msg);
  }
  static notFound(msg = "Không tìm thấy") {
    return new ApiError(404, msg);
  }
  static conflict(msg) {
    return new ApiError(409, msg);
  }
  static internal(msg = "Lỗi hệ thống") {
    return new ApiError(500, msg);
  }
}
