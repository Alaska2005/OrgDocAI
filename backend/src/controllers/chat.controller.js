// src/controllers/chat.controller.js
// Handles AI chatbot queries with RAG pipeline

const { PrismaClient } = require('@prisma/client');
const { chatWithRAG } = require('../services/rag.service');

const prisma = new PrismaClient();

// ─── Send Message to AI ───────────────────────────────────
const sendMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const { orgId, userId } = req.user;

    // Get the organization name for context
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    // Fetch recent conversation history for context (last 10 messages)
    const conversationHistory = await prisma.chatMessage.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { role: true, content: true },
    });

    // Reverse so oldest first (chronological order for context)
    conversationHistory.reverse();

    // Save user message
    await prisma.chatMessage.create({
      data: {
        role: 'USER',
        content: message,
        organizationId: orgId,
        userId,
      },
    });

    // Run RAG pipeline
    const { answer, sources } = await chatWithRAG({
      query: message,
      orgId,
      orgName: org.name,
      conversationHistory,
      prisma,
    });

    // Save AI response
    const savedResponse = await prisma.chatMessage.create({
      data: {
        role: 'ASSISTANT',
        content: answer,
        sources: sources,
        organizationId: orgId,
      },
    });

    res.json({
      message: answer,
      sources,
      messageId: savedResponse.id,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Chat History ─────────────────────────────────────
const getHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const messages = await prisma.chatMessage.findMany({
      where: { organizationId: req.user.orgId },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: Number(limit),
      select: {
        id: true,
        role: true,
        content: true,
        sources: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });

    res.json({ messages });
  } catch (err) {
    next(err);
  }
};

// ─── Clear Chat History ───────────────────────────────────
const clearHistory = async (req, res, next) => {
  try {
    await prisma.chatMessage.deleteMany({
      where: { organizationId: req.user.orgId },
    });
    res.json({ message: 'Chat history cleared.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendMessage, getHistory, clearHistory };
