// Validate body/params/query bằng Zod schema.
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError.js";

export const validate = (schema, target = "body") => (req, res, next) => {
  try {
    const data = schema.parse(req[target]);
    // Express 5: req.query là getter, không gán được — chỉ gán body/params
    if (target === "query" || target === "params") {
      // Object.assign để mutate trên object gốc
      Object.assign(req[target], data);
    } else {
      req[target] = data; // body có thể gán lại an toàn
    }
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
