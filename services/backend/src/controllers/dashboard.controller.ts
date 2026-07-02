import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MultiTenantRequest } from '../middleware/tenant.middleware';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: MultiTenantRequest, res: Response) => {
  try {
    if (!req.tenant) {
      return res.status(403).json({ error: 'Active organization context required' });
    }

    const organizationId = req.tenant.id;

    // Get total invoices count scoped to tenant organization
    const totalInvoices = await prisma.invoice.count({
      where: { organizationId }
    });

    // Get total revenue (sum of PAID invoices)
    const revenueResult = await prisma.invoice.aggregate({
      where: { organizationId, status: 'PAID' },
      _sum: { total: true }
    });

    // Get outstanding payments (sum of SENT or OVERDUE invoices)
    const outstandingResult = await prisma.invoice.aggregate({
      where: { 
        organizationId, 
        status: { in: ['SENT', 'OVERDUE'] }
      },
      _sum: { total: true }
    });

    // Get recent invoices
    const recentInvoices = await prisma.invoice.findMany({
      where: { organizationId },
      include: {
        client: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Get monthly revenue data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await prisma.invoice.groupBy({
      by: ['date'],
      where: {
        organizationId,
        status: 'PAID',
        date: { gte: sixMonthsAgo }
      },
      _sum: { total: true }
    });

    const stats = {
      totalInvoices,
      totalRevenue: revenueResult._sum?.total || 0,
      outstandingPayments: outstandingResult._sum?.total || 0,
      recentInvoices,
      monthlyRevenue
    };

    res.json({ stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};