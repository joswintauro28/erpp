import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const generateInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Get the last invoice number for this month
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: `INV-${year}${month}`
      }
    },
    orderBy: { invoiceNumber: 'desc' }
  });

  let sequence = 1;
  if (lastInvoice) {
    const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;
};

export const generateQuotationNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Get the last quotation number for this month
  const lastQuotation = await prisma.quotation.findFirst({
    where: {
      quotationNumber: {
        startsWith: `QUO-${year}${month}`
      }
    },
    orderBy: { quotationNumber: 'desc' }
  });

  let sequence = 1;
  if (lastQuotation) {
    const parts = lastQuotation.quotationNumber.split('-');
    const lastSequence = parseInt(parts[2] || parts[1]);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `QUO-${year}${month}-${String(sequence).padStart(4, '0')}`;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};