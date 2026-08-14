/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

import type { Request, Response } from 'express';
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { storage } from '../storage';
import { AppError, asyncHandler } from '../middlewares/error.middleware';
import type { RequestWithChannel } from '../middlewares/channel.middleware';
import { pool } from '../db';

async function getSuperadminScopedStats(superadminId: string) {
  const { rows } = await pool.query(
    `
      WITH scoped_clients AS (
        SELECT id
        FROM users
        WHERE role = 'admin' AND created_by = $1
      ),
      scoped_channels AS (
        SELECT id
        FROM channels
        WHERE created_by IN (SELECT id FROM scoped_clients)
           OR white_label_client_id IN (SELECT id FROM scoped_clients)
      )
      SELECT
        COALESCE((SELECT COUNT(*)::int FROM contacts WHERE channel_id IN (SELECT id FROM scoped_channels)), 0) AS "totalContacts",
        COALESCE((SELECT COUNT(*)::int FROM contacts WHERE channel_id IN (SELECT id FROM scoped_channels) AND created_at >= CURRENT_DATE), 0) AS "todayContacts",
        COALESCE((SELECT COUNT(*)::int FROM contacts WHERE channel_id IN (SELECT id FROM scoped_channels) AND created_at >= NOW() - INTERVAL '7 days'), 0) AS "weekContacts",
        COALESCE((SELECT COUNT(*)::int FROM contacts WHERE channel_id IN (SELECT id FROM scoped_channels) AND created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days'), 0) AS "lastWeekContacts",
        COALESCE((SELECT COUNT(*)::int FROM campaigns WHERE channel_id IN (SELECT id FROM scoped_channels)), 0) AS "totalCampaigns",
        COALESCE((SELECT COUNT(*)::int FROM templates WHERE channel_id IN (SELECT id FROM scoped_channels)), 0) AS "totalTemplates",
        COALESCE((SELECT COUNT(*)::int FROM scoped_clients), 0) AS "totalUsers",
        COALESCE((SELECT COUNT(*)::int FROM scoped_clients c INNER JOIN users u ON u.id = c.id WHERE u.status = 'active'), 0) AS "totalActiveUsers",
        COALESCE((SELECT COUNT(*)::int FROM scoped_clients c INNER JOIN users u ON u.id = c.id WHERE u.status IN ('blocked', 'banned', 'inactive')), 0) AS "totalBlockedUsers",
        COALESCE((SELECT COUNT(*)::int FROM scoped_clients c INNER JOIN users u ON u.id = c.id WHERE u.created_at >= CURRENT_DATE), 0) AS "todaySignups",
        COALESCE((SELECT COUNT(*)::int FROM scoped_channels), 0) AS "totalChannels",
        0 AS "totalPaidUsers",
        COALESCE((SELECT COUNT(*)::int FROM messages m INNER JOIN conversations cv ON cv.id = m.conversation_id WHERE cv.channel_id IN (SELECT id FROM scoped_channels)), 0) AS "totalMessages",
        COALESCE((SELECT COUNT(*)::int FROM messages m INNER JOIN conversations cv ON cv.id = m.conversation_id WHERE cv.channel_id IN (SELECT id FROM scoped_channels) AND m.direction = 'outbound'), 0) AS "messagesSent",
        COALESCE((SELECT COUNT(*)::int FROM messages m INNER JOIN conversations cv ON cv.id = m.conversation_id WHERE cv.channel_id IN (SELECT id FROM scoped_channels) AND m.status IN ('delivered', 'read')), 0) AS "messagesDelivered",
        COALESCE((SELECT COUNT(*)::int FROM messages m INNER JOIN conversations cv ON cv.id = m.conversation_id WHERE cv.channel_id IN (SELECT id FROM scoped_channels) AND m.status = 'read'), 0) AS "messagesRead",
        COALESCE((SELECT COUNT(*)::int FROM messages m INNER JOIN conversations cv ON cv.id = m.conversation_id WHERE cv.channel_id IN (SELECT id FROM scoped_channels) AND m.status = 'failed'), 0) AS "messagesFailed",
        COALESCE((SELECT COUNT(*)::int FROM messages m INNER JOIN conversations cv ON cv.id = m.conversation_id WHERE cv.channel_id IN (SELECT id FROM scoped_channels) AND m.created_at >= CURRENT_DATE), 0) AS "todayMessages",
        COALESCE((SELECT COUNT(*)::int FROM messages m INNER JOIN conversations cv ON cv.id = m.conversation_id WHERE cv.channel_id IN (SELECT id FROM scoped_channels) AND m.created_at >= date_trunc('month', NOW())), 0) AS "thisMonthMessages",
        COALESCE((SELECT COUNT(*)::int FROM messages m INNER JOIN conversations cv ON cv.id = m.conversation_id WHERE cv.channel_id IN (SELECT id FROM scoped_channels) AND m.created_at >= date_trunc('month', NOW() - INTERVAL '1 month') AND m.created_at < date_trunc('month', NOW())), 0) AS "lastMonthMessages"
    `,
    [superadminId]
  );

  return rows[0] || {};
}

export const getDashboardStats = asyncHandler(async (req: RequestWithChannel, res: Response) => {
  const channelId = req.query.channelId as string | undefined;
  const user = (req.session as any)?.user;
  
  if (channelId) {
    if (user && user.role === 'superadmin') {
      const allowed = await pool.query(
        `
          SELECT c.id
          FROM channels c
          WHERE c.id = $1
            AND COALESCE(c.white_label_client_id, NULLIF(c.created_by,'')) IN (
              SELECT id FROM users WHERE role = 'admin' AND created_by = $2
            )
          LIMIT 1
        `,
        [channelId, user.id]
      );
      if (!allowed.rows[0]) {
        return res.status(403).json({ error: 'Access denied to this channel' });
      }
    } else if (user && user.role !== 'platform_admin') {
      const ownerId = user.role === 'team' ? user.createdBy : user.id;
      const channels = await storage.getChannelsByUserId(ownerId);
      const channelIds = channels.map((ch: any) => ch.id);
      if (!channelIds.includes(channelId)) {
        return res.status(403).json({ error: 'Access denied to this channel' });
      }
    }
    const userId = user?.id || '';
    const stats = await storage.getDashboardStatsByChannel(channelId, userId);
    res.json(stats);
  } else if (user && user.role === 'platform_admin') {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  } else if (user && user.role === 'superadmin') {
    const stats = await getSuperadminScopedStats(user.id);
    res.json(stats);
  } else {
    const ownerId = user?.role === 'team' ? user?.createdBy : user?.id;
    if (!ownerId) return res.json({ totalMessages: 0, activeCampaigns: 0, deliveryRate: 0, newLeads: 0, messagesGrowth: 0, campaignsRunning: 0, unreadChats: 0 });
    const channels = await storage.getChannelsByUserId(ownerId);
    if (channels.length === 0) return res.json({ totalMessages: 0, activeCampaigns: 0, deliveryRate: 0, newLeads: 0, messagesGrowth: 0, campaignsRunning: 0, unreadChats: 0 });
    const stats = await storage.getDashboardStatsByChannel(channels[0].id, user?.id || '');
    res.json(stats);
  }
});


export const getDashboardStatsForAdmin = asyncHandler(async (req: RequestWithChannel, res: Response) => {
    const user = (req.session as any)?.user;
    if (!user || (user.role !== 'superadmin' && user.role !== 'platform_admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const stats = user.role === 'platform_admin'
      ? await storage.getDashboardStats()
      : await getSuperadminScopedStats(user.id);
    res.json(stats);
});

export const getDashboardStatsForUser = asyncHandler(async(req: RequestWithChannel, res: Response) => {
  const channelId = req.query.channelId as string | undefined;
  const user = (req.session as any)?.user;
  const userId = user?.id;

  // Verify channel ownership before returning per-channel user stats.
  if (channelId && user && user.role === 'superadmin') {
    const allowed = await pool.query(
      `
        SELECT c.id
        FROM channels c
        WHERE c.id = $1
          AND COALESCE(c.white_label_client_id, NULLIF(c.created_by,'')) IN (
            SELECT id FROM users WHERE role = 'admin' AND created_by = $2
          )
        LIMIT 1
      `,
      [channelId, user.id]
    );
    if (!allowed.rows[0]) {
      return res.status(403).json({ error: 'Access denied to this channel' });
    }
  } else if (channelId && user && user.role !== 'platform_admin') {
    const ownerId = user.role === 'team' ? user.createdBy : user.id;
    const channels = await storage.getChannelsByUserId(ownerId);
    const channelIds = channels.map((ch: any) => ch.id);
    if (!channelIds.includes(channelId)) {
      return res.status(403).json({ error: 'Access denied to this channel' });
    }
  }

  const stats = await storage.getDashboardStatsByChannel(channelId || '', userId)
  res.json(stats);
})

export const getAnalytics = asyncHandler(async (req: RequestWithChannel, res: Response) => {
  const channelId = req.query.channelId as string | undefined;
  const days = req.query.days ? parseInt(req.query.days as string) : undefined;
  const user = (req.session as any)?.user;
  
  if (channelId) {
    if (user && user.role === 'superadmin') {
      const allowed = await pool.query(
        `
          SELECT c.id
          FROM channels c
          WHERE c.id = $1
            AND COALESCE(c.white_label_client_id, NULLIF(c.created_by,'')) IN (
              SELECT id FROM users WHERE role = 'admin' AND created_by = $2
            )
          LIMIT 1
        `,
        [channelId, user.id]
      );
      if (!allowed.rows[0]) {
        return res.status(403).json({ error: 'Access denied to this channel' });
      }
    } else if (user && user.role !== 'platform_admin') {
      const ownerId = user.role === 'team' ? user.createdBy : user.id;
      const channels = await storage.getChannelsByUserId(ownerId);
      const channelIds = channels.map((ch: any) => ch.id);
      if (!channelIds.includes(channelId)) {
        return res.status(403).json({ error: 'Access denied to this channel' });
      }
    }
    const analytics = await storage.getAnalyticsByChannel(channelId, days);
    res.json(analytics);
  } else if (user && user.role === 'platform_admin') {
    const analytics = await storage.getAnalytics();
    res.json(analytics);
  } else if (user && user.role === 'superadmin') {
    res.json([]);
  } else {
    const ownerId = user?.role === 'team' ? user?.createdBy : user?.id;
    if (!ownerId) return res.json([]);
    const channels = await storage.getChannelsByUserId(ownerId);
    if (channels.length === 0) return res.json([]);
    const analytics = await storage.getAnalyticsByChannel(channels[0].id, days);
    res.json(analytics);
  }
});

export const createAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const analytics = await storage.createAnalytics(req.body);
  res.json(analytics);
});
