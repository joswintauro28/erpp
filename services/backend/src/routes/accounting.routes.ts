import { Router } from 'express';
import { 
  getAccounts, 
  getJournalEntries, 
  createJournalEntry, 
  getExpenses, 
  createExpense, 
  getProfitLoss, 
  getBalanceSheet, 
  getTrialBalance, 
  getCashFlow, 
  getIntegrationPayloads 
} from '../controllers/accounting.controller';
import { authenticateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Secure all ledger routes under active tenant organization locks
router.use(authenticateTenant);

router.get('/accounts', getAccounts);
router.get('/journal-entries', getJournalEntries);
router.post('/journal-entries', createJournalEntry);
router.get('/expenses', getExpenses);
router.post('/expenses', createExpense);
router.get('/reports/profit-loss', getProfitLoss);
router.get('/reports/balance-sheet', getBalanceSheet);
router.get('/reports/trial-balance', getTrialBalance);
router.get('/reports/cash-flow', getCashFlow);
router.get('/integrations/:provider', getIntegrationPayloads);

export default router;
