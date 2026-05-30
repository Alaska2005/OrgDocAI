// src/controllers/event.controller.js
// CRUD operations for events within an organization

const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const eventSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().min(10),
  date: z.string().datetime(),
  category: z.string().min(1),
  coordinator: z.string().min(2),
  tags: z.array(z.string()).optional().default([]),
  bannerColor: z.string().optional().default('#6C63FF'),
});

// ─── List All Events ──────────────────────────────────────
const listEvents = async (req, res, next) => {
  try {
    const { search, category, year, page = 1, limit = 20 } = req.query;
    const orgId = req.user.orgId;

    const where = {
      organizationId: orgId,
      ...(category && { category }),
      ...(year && {
        date: {
          gte: new Date(`${year}-01-01`),
          lte: new Date(`${year}-12-31`),
        },
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { coordinator: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } },
        ],
      }),
    };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: Number(limit),
        include: {
          _count: { select: { files: true } },
          files: {
            select: { type: true },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    // Group file counts by type
    const eventsWithCounts = events.map((event) => {
      const counts = { DOCUMENT: 0, SPREADSHEET: 0, IMAGE: 0, VIDEO: 0 };
      event.files.forEach((f) => counts[f.type]++);
      return { ...event, files: undefined, fileCounts: counts };
    });

    res.json({
      events: eventsWithCounts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Event ─────────────────────────────────────
const getEvent = async (req, res, next) => {
  try {
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, organizationId: req.user.orgId },
      include: {
        files: {
          include: { uploadedBy: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!event) return res.status(404).json({ error: 'Event not found.' });

    // Separate files by type for frontend convenience
    const documents = event.files.filter((f) => f.type === 'DOCUMENT');
    const spreadsheets = event.files.filter((f) => f.type === 'SPREADSHEET');
    const images = event.files.filter((f) => f.type === 'IMAGE');
    const videos = event.files.filter((f) => f.type === 'VIDEO');

    res.json({ ...event, files: { documents, spreadsheets, images, videos } });
  } catch (err) {
    next(err);
  }
};

// ─── Create Event ─────────────────────────────────────────
const createEvent = async (req, res, next) => {
  try {
    const data = eventSchema.parse(req.body);

    const event = await prisma.event.create({
      data: {
        ...data,
        date: new Date(data.date),
        organizationId: req.user.orgId,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'created event',
        details: `Created event: ${event.title}`,
        userId: req.user.userId,
        eventId: event.id,
      },
    });

    res.status(201).json(event);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
};

// ─── Update Event ─────────────────────────────────────────
const updateEvent = async (req, res, next) => {
  try {
    const data = eventSchema.partial().parse(req.body);

    const event = await prisma.event.findFirst({
      where: { id: req.params.id, organizationId: req.user.orgId },
    });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: { ...data, ...(data.date && { date: new Date(data.date) }) },
    });

    res.json(updated);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
};

// ─── Delete Event ─────────────────────────────────────────
const deleteEvent = async (req, res, next) => {
  try {
    // Admin only (checked in route middleware)
    const event = await prisma.event.findFirst({
      where: { id: req.params.id, organizationId: req.user.orgId },
    });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    await prisma.event.delete({ where: { id: req.params.id } });

    res.json({ message: 'Event deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listEvents, getEvent, createEvent, updateEvent, deleteEvent };
