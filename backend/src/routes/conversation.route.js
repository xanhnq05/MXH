import { Router } from "express";
import { conversationController } from "../controllers/conversation.controller.js";
import { protectedRoute } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createDirectSchema,
  createGroupSchema,
  updateGroupSchema,
  addMembersSchema,
  changeRoleSchema,
  setNicknameSchema,
  muteSchema,
  pinSchema,
} from "../validators/chat.validator.js";

const router = Router();
router.use(protectedRoute);

router.get("/", conversationController.list);
router.post("/direct", validate(createDirectSchema), conversationController.getOrCreateDirect);
router.post("/group", validate(createGroupSchema), conversationController.createGroup);
router.get("/:id", conversationController.getById);
router.patch("/:id", validate(updateGroupSchema), conversationController.updateGroup);
router.delete("/:id", conversationController.deleteGroup);
router.post("/:id/leave", conversationController.leaveGroup);

router.post("/:id/members", validate(addMembersSchema), conversationController.addMembers);
router.delete("/:id/members/:userId", conversationController.removeMember);
router.patch(
  "/:id/role",
  validate(changeRoleSchema),
  conversationController.changeRole
);
router.patch(
  "/:id/nickname",
  validate(setNicknameSchema),
  conversationController.setNickname
);
router.patch("/:id/mute", validate(muteSchema), conversationController.mute);

router.post("/:id/pin", validate(pinSchema), conversationController.pinMessage);
router.post("/:id/unpin", validate(pinSchema), conversationController.unpinMessage);

export default router;
