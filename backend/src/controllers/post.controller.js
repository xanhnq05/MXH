import { postService } from "../services/post.service.js";
import { commentService } from "../services/comment.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const postController = {
  create: asyncHandler(async (req, res) => {
    // Tags co the gui len dang: array, CSV string, hoac JSON string
    let tags = [];
    if (Array.isArray(req.body.tags)) {
      tags = req.body.tags;
    } else if (typeof req.body.tags === "string") {
      const s = req.body.tags.trim();
      if (s.startsWith("[")) {
        try {
          tags = JSON.parse(s);
        } catch {
          tags = s.split(",");
        }
      } else if (s.length) {
        tags = s.split(",");
      }
    }
    const post = await postService.create(req.user._id, {
      ...req.body,
      tags,
      files: req.files,
    });
    res.status(201).json({ post });
  }),

  getById: asyncHandler(async (req, res) => {
    res.json({ post: await postService.getById(req.user._id, req.params.id) });
  }),

  update: asyncHandler(async (req, res) => {
    res.json({
      post: await postService.update(req.user._id, req.params.id, req.body),
    });
  }),

  remove: asyncHandler(async (req, res) => {
    await postService.softDelete(req.user._id, req.params.id);
    res.status(204).end();
  }),

  like: asyncHandler(async (req, res) => {
    res.json(await postService.likePost(req.user._id, req.params.id));
  }),

  unlike: asyncHandler(async (req, res) => {
    res.json(await postService.unlikePost(req.user._id, req.params.id));
  }),

  feed: asyncHandler(async (req, res) => {
    res.json(await postService.getFeed(req.user._id, req.query));
  }),

  search: asyncHandler(async (req, res) => {
    const q = (req.query.q || "").toString();
    res.json(
      await postService.search(req.user._id, q, {
        cursor: req.query.cursor,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      })
    );
  }),

  listByUser: asyncHandler(async (req, res) => {
    res.json(
      await postService.listByUser(req.user._id, req.params.userId, req.query)
    );
  }),

  // Lấy danh sách user đã thích bài viết
  likers: asyncHandler(async (req, res) => {
    res.json(
      await postService.getLikers(req.user._id, req.params.id, req.query)
    );
  }),

  // Lấy danh sách năm có bài viết của user
  userYears: asyncHandler(async (req, res) => {
    const years = await postService.getUserPostYears(req.params.userId);
    res.json({ years });
  }),

  // Lấy danh sách tags của user
  userTags: asyncHandler(async (req, res) => {
    const tags = await postService.getUserTags(req.params.userId);
    res.json({ tags });
  }),
};

export const commentController = {
  create: asyncHandler(async (req, res) => {
    const c = await commentService.create(req.user._id, req.params.postId, req.body);
    res.status(201).json({ comment: c });
  }),

  list: asyncHandler(async (req, res) => {
    res.json(
      await commentService.list(req.params.postId, {
        ...req.query,
        parentId: req.query.parentId || null,
      })
    );
  }),

  update: asyncHandler(async (req, res) => {
    res.json({
      comment: await commentService.update(req.user._id, req.params.id, req.body),
    });
  }),

  remove: asyncHandler(async (req, res) => {
    await commentService.softDelete(req.user._id, req.params.id);
    res.status(204).end();
  }),
};
