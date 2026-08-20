'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../system-configs/middleware/auth/auth');
const { prisma, getCompanyPrisma } = require('@workspace/db');

// Consolidated Bootstrap Endpoint — Batches user, company, preferences, and notifications into 1 roundtrip
router.get('/bootstrap', protect, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    const companyPrisma = companyId ? getCompanyPrisma(companyId) : prisma;

    const [user, company, userPref, unreadCount, recentNotifications] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          permissions: true,
          companyId: true,
          photoUrl: true,
          isActive: true,
        }
      }),
      companyId ? prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          slug: true,
          metadata: true,
          logoUrl: true,
          customDomain: true,
          isOnboardingComplete: true,
        }
      }) : null,
      prisma.userPreference.findFirst({
        where: { userId },
        select: { favorites: true, recentItems: true }
      }),
      companyId ? companyPrisma.notification.count({
        where: { userId, isRead: false }
      }) : 0,
      companyId ? companyPrisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5
      }) : []
    ]);

    if (company) {
      company.enabledApps = company.metadata?.enabledApps || [];
      company.enabledModules = company.metadata?.enabledModules || [];
      delete company.metadata; // Clean up metadata if we only wanted those fields, or we can leave it
    }

    res.json({
      success: true,
      user,
      company,
      preferences: userPref || { favorites: [], recentItems: [], theme: 'light' },
      notifications: {
        unreadCount,
        recent: recentNotifications
      },
      setupStatus: {
        isOnboardingComplete: company?.isOnboardingComplete ?? false
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
