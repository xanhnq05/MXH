// Validate body/params/query bằng Zod schema.
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";

export const validate = (schema, target = "body") => (req, res, next) => {
  try {
    const data = schema.parse(req[target]);
    req[target] = data; // gán lại object đã được strip (chỉ giữ field trong schema)
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return next(
        ApiError.badRequest(
          "Dữ liệu không hợp lệ",
          err.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          }))
        )
      );
    }
    next(err);
  }
};
