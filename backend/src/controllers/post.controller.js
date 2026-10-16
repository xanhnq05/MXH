import { postService } from "../services/post.service.js";
import { commentService } from "../services/comment.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const postController = {
  create: asyncHandler(async (req, res) => {
    const post = await postService.create(req.user._id, {
      ...req.body,
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

  listByUser: asyncHandler(async (req, res) => {
    res.json(
      await postService.listByUser(req.user._id, req.params.userId, req.query)
    );
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
