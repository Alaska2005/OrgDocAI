// src/controllers/analytics.controller.js
// Dashboard analytics — counts, breakdowns, recent activity

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAnalytics = async (req, res, next) => {
  try {
    const orgId = req.user.orgId;

    const [
      totalEvents,
      totalFiles,
      totalMembers,
      filesByType,
      eventsByCategory,
      recentActivity,
      monthlyEvents,
    ] = await Promise.all([
      prisma.event.count({ where: { organizationId: orgId } }),

      prisma.file.count({ where: { event: { organizationId: orgId } } }),

      prisma.user.count({ where: { organizationId: orgId } }),

      prisma.file.groupBy({
        by: ['type'],
        where: { event: { organizationId: orgId } },
        _count: true,
        _sum: { size: true },
      }),

      prisma.event.groupBy({
        by: ['category'],
        where: { organizationId: orgId },
        _count: true,
      }),

      prisma.activityLog.findMany({
        where: { user: { organizationId: orgId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { name: true } },
          event: { select: { title: true } },
        },
      }),

      // Events per month for the current year
      prisma.$queryRaw`
        SELECT
          EXTRACT(MONTH FROM date) AS month,
          COUNT(*) AS count
        FROM events
        WHERE "organizationId" = ${orgId}
          AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM NOW())
        GROUP BY month
        ORDER BY month
      `,
    ]);

    // Convert BigInt to Number for JSON serialization
    const serializedMonthlyEvents = monthlyEvents.map((event) => ({
      month: Number(event.month),
      count: Number(event.count),
    }));

    res.json({
      summary: { totalEvents, totalFiles, totalMembers },
      filesByType,
      eventsByCategory,
      recentActivity,
      monthlyEvents: serializedMonthlyEvents,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAnalytics };
