import { stickerService } from "../services/sticker.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const stickerController = {
  listPacks: asyncHandler(async (req, res) => {
    res.json({ packs: await stickerService.listPacks() });
  }),
  getPack: asyncHandler(async (req, res) => {
    res.json({ pack: await stickerService.getPack(req.params.key) });
  }),
  search: asyncHandler(async (req, res) => {
    res.json({ stickers: await stickerService.searchStickers(req.query.q) });
  }),
};
