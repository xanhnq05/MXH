import { Router } from "express";
import { postController, commentController } from "../controllers/post.controller.js";
import { protectedRoute } from "../middlewares/auth.middleware.js";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
  updateCommentSchema,
} from "../validators/post.validator.js";

const router = Router();
router.use(protectedRoute);

// Post
router.post(
  "/",
  uploadMiddleware.array("files", 10),
  (req, _res, next) => {
    // multer xong mới validate
    if (req.body) {
      // convert visibility
      if (typeof req.body.visibility === "string") {
        // ok
      }
    }
    next();
  },
  // Validate sau khi multer parse xong
  (req, res, next) => {
    const parseResult = createPostSchema.safeParse(req.body);
    if (!parseResult.success) {
      return next(parseResult.error);
    }
    req.body = parseResult.data;
    next();
  },
  postController.create
);

router.get("/feed", postController.feed);
router.get("/search", postController.search);
router.get("/by-user/:userId/years", postController.userYears);
router.get("/by-user/:userId/tags", postController.userTags);
router.get("/by-user/:userId", postController.listByUser);
router.get("/:id", postController.getById);
// Lấy danh sách user đã like - đặt trước /:id/like để tránh conflict
router.get("/:id/likers", postController.likers);
router.patch("/:id", validate(updatePostSchema), postController.update);
router.delete("/:id", postController.remove);

router.put("/:id/like", postController.like);
router.delete("/:id/like", postController.unlike);

// Comments
router.get("/:postId/comments", commentController.list);
router.post(
  "/:postId/comments",
  validate(createCommentSchema),
  commentController.create
);

export default router;
