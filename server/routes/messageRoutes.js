import express from 'express';
import { sendMessage, getMessages, getUserForSidebar, markMessageAsSeen, reactToMessage } from '../controller/messageController.js';
import { protectRoute } from '../middleware/auth.js';

const messageRouter = express.Router();

messageRouter.get('/users',protectRoute, getUserForSidebar);
messageRouter.get('/:id',protectRoute, getMessages);
messageRouter.put('/mark/:id',protectRoute, markMessageAsSeen);
messageRouter.put('/react/:id',protectRoute, reactToMessage);
messageRouter.post('/send/:id',protectRoute, sendMessage);

export default messageRouter;