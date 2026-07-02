import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Routes
import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/client.routes';
import invoiceRoutes from './routes/invoice.routes';
import dashboardRoutes from './routes/dashboard.routes';
import leadRoutes from './routes/lead.routes';
import activityRoutes from './routes/activity.routes';
import quotationRoutes from './routes/quotation.routes';
import subscriptionRoutes from './routes/subscription.routes';
import paymentRoutes from './routes/payment.routes';
import complianceRoutes from './routes/compliance.routes';
import accountingRoutes from './routes/accounting.routes';
import aiRoutes from './routes/ai.routes';
import inventoryRoutes from './routes/inventory.routes';
import expenseManagementRoutes from './routes/expense-management.routes';
import analyticsRoutes from './routes/analytics.routes';
import aiAutomationRoutes from './routes/ai-automation.routes';
import notificationRoutes from './routes/notification.routes';
import documentRoutes from './routes/document.routes';
import workflowRoutes from './routes/workflow.routes';
import securityRoutes from './routes/security.routes';
import settingsRoutes from './routes/settings.routes';
import { wafGuard, rateLimiterGuard } from './middleware/security.middleware';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(wafGuard as express.RequestHandler);
app.use(rateLimiterGuard as express.RequestHandler);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/expenses', expenseManagementRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai-automation', aiAutomationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Billing App API is running' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

export default app;