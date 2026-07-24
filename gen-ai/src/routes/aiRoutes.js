import express from 'express';
import { handleAiChat } from '../controllers/aiController.js';

const router = express.Router();

// AI Chatbot & Stock RAG Endpoint
router.post('/chat', handleAiChat);

export default router;
