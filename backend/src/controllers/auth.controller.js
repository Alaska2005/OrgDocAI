// src/controllers/auth.controller.js
// Handles organization registration, login, token refresh

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ─── Validation Schemas ───────────────────────────────────
const registerSchema = z.object({
  orgName: z.string().min(2).max(100),
  adminName: z.string().min(2).max(100),
  adminEmail: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  identifier: z.string().min(1), // org name or orgId
  password: z.string().min(1),
});

// ─── Helpers ──────────────────────────────────────────────
const generateOrgId = (name) => {
  const prefix = name.replace(/\s+/g, '').toUpperCase().slice(0, 3);
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
};

const generateTokens = (userId, orgId) => {
  const accessToken = jwt.sign(
    { userId, orgId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId, orgId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

// ─── Register Organization ────────────────────────────────
const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if email already exists
    const existing = await prisma.organization.findUnique({
      where: { adminEmail: data.adminEmail },
    });
    if (existing) {
      return res.status(409).json({ error: 'An organization with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const orgId = generateOrgId(data.orgName);

    // Create org + admin user in a transaction
    const { org, admin } = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          orgId,
          name: data.orgName,
          passwordHash,
          adminName: data.adminName,
          adminEmail: data.adminEmail,
        },
      });

      const admin = await tx.user.create({
        data: {
          name: data.adminName,
          email: data.adminEmail,
          passwordHash,
          role: 'ADMIN',
          organizationId: org.id,
        },
      });

      return { org, admin };
    });

    const { accessToken, refreshToken } = generateTokens(admin.id, org.id);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: admin.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      message: 'Organization registered successfully.',
      orgId: org.orgId,
      organization: { id: org.id, name: org.name, orgId: org.orgId },
      user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
};

// ─── Login ────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);

    // Find org by name or orgId
    const org = await prisma.organization.findFirst({
      where: {
        OR: [
          { name: { equals: identifier, mode: 'insensitive' } },
          { orgId: identifier },
        ],
      },
    });
    if (!org) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, org.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Get admin user for this org
    const user = await prisma.user.findFirst({
      where: { organizationId: org.id, role: 'ADMIN' },
    });

    const { accessToken, refreshToken } = generateTokens(user.id, org.id);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      organization: { id: org.id, name: org.name, orgId: org.orgId },
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    next(err);
  }
};

// ─── Refresh Token ────────────────────────────────────────
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required.' });
    }

    // Verify token exists in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      decoded.userId,
      decoded.orgId
    );

    // Rotate refresh token
    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { token: refreshToken } }),
      prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: decoded.userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};

// ─── Logout ───────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── Get Current User ─────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { organization: { select: { id: true, name: true, orgId: true } } },
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, me };
