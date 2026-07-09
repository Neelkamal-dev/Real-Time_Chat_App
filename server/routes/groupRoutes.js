import express from "express";
import {
  createGroup,
  getUserGroups,
  getGroupMessages,
  sendGroupMessage,
} from "../controller/groupController.js";
import { protectRoute } from "../middleware/auth.js";

const groupRouter = express.Router();

groupRouter.post("/", protectRoute, createGroup);
groupRouter.get("/", protectRoute, getUserGroups);
groupRouter.get("/:groupId/messages", protectRoute, getGroupMessages);
groupRouter.post("/:groupId/send", protectRoute, sendGroupMessage);

export default groupRouter;
