import puppeteer from 'puppeteer';
import { formatCurrency } from '../utils/helpers';

export const generateInvoicePDF = async (invoice: any): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    const html = generateInvoiceHTML(invoice);
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
};

const generateInvoiceHTML = (invoice: any): string => {
  // Format items table rows
  const itemsHTML = invoice.items?.map((item: any) => `
    <tr>
      <td>${item.description}</td>
      <td class="amount">${item.quantity}</td>
      <td class="amount">${formatCurrency(item.rate)}</td>
      <td class="amount">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('') || '';

  // Format dynamic tax rows
  const taxesHTML = invoice.taxes?.map((tax: any) => `
    <tr>
      <td>${tax.name} (${tax.rate}%)</td>
      <td class="amount">${formatCurrency(tax.amount)}</td>
    </tr>
  `).join('') || '';

  // Safe formatting for currency/discounts
  const discountRow = invoice.discountAmount > 0 ? `
    <tr>
      <td>Discount Deductions</td>
      <td class="amount">-${formatCurrency(invoice.discountAmount)}</td>
    </tr>
  ` : '';

  // Formulate stylized dynamic header titles based on Invoice Type
  let typeTitle = 'TAX INVOICE';
  if (invoice.invoiceType === 'PROFORMA') typeTitle = 'PROFORMA INVOICE';
  if (invoice.invoiceType === 'RECURRING') typeTitle = 'RECURRING INVOICE';
  if (invoice.invoiceType === 'DEBIT_NOTE') typeTitle = 'DEBIT NOTE';
  if (invoice.invoiceType === 'CREDIT_NOTE') typeTitle = 'CREDIT NOTE';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 25px; color: #1E293B; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 25px; }
        .company-info h1 { margin: 0; color: #000; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
        .company-info p { margin: 6px 0 0 0; color: #64748B; font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
        .invoice-info { text-align: right; }
        .invoice-info h2 { margin: 0; color: #000; font-size: 28px; font-weight: 800; letter-spacing: -1px; }
        .invoice-info p { margin: 6px 0 0 0; font-size: 12px; color: #475569; font-weight: 500; }
        .parties { display: flex; justify-content: space-between; margin-bottom: 40px; margin-top: 20px; }
        .party { width: 45%; }
        .party h3 { margin: 0 0 8px 0; color: #0F172A; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; }
        .party p { margin: 4px 0; font-size: 13px; color: #334155; line-height: 1.4; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 35px; margin-top: 20px; }
        th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #E2E8F0; font-size: 12px; }
        th { background-color: #F8FAFC; font-weight: 800; color: #475569; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; border-bottom: 2px solid #E2E8F0; }
        .amount { text-align: right; }
        
        /* Bottom Layout Row: Totals & Payments */
        .bottom-section { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 20px; }
        
        .smart-features-box { width: 50%; display: flex; flex-direction: column; gap: 20px; }
        
        /* Dynamic UPI QR Code */
        .qr-code-wrapper { display: flex; align-items: center; gap: 15px; background: #F8FAFC; p-3 border border-[#E2E8F0] rounded-xl p-3 width: fit-content; }
        .qr-code-wrapper img { border-radius: 6px; }
        .qr-code-details h4 { margin: 0; font-size: 10px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; }
        .qr-code-details p { margin: 4px 0 0 0; font-size: 9px; color: #64748B; line-height: 1.3; }

        /* Dynamic Totals Table */
        .totals { width: 260px; }
        .totals table { margin: 0; width: 100%; }
        .totals td { padding: 8px 12px; border-bottom: none; font-size: 12px; font-weight: 500; color: #475569; }
        .totals td.amount { color: #0F172A; font-weight: 600; }
        .total-row { border-top: 2px solid #000; font-size: 15px !important; font-weight: 800 !important; color: #000 !important; }
        .total-row td.amount { color: #000 !important; font-weight: 800 !important; }

        .notes { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; }
        .notes h4 { margin: 0 0 8px 0; font-size: 10px; text-transform: uppercase; color: #475569; font-weight: 800; }
        .notes p { margin: 0; font-size: 12px; color: #64748B; line-height: 1.5; }

        /* E-signature Cryptographic Seal */
        .signature-seal-box { margin-top: 30px; background: #F8FAFC; border: 1px dashed #CBD5E1; padding: 12px 16px; border-radius: 8px; font-family: monospace; }
        .signature-seal-box p { margin: 0; font-size: 9px; color: #64748B; font-weight: 700; }
        .signature-seal-box .seal-hash { margin-top: 4px; font-size: 8px; color: #94A3B8; word-break: break-all; font-weight: 500; }

        .footer { margin-top: 50px; text-align: center; color: #94A3B8; font-size: 10px; border-top: 1px dashed #E2E8F0; padding-top: 20px; font-weight: 500; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h1>${invoice.organization?.name || 'Kaasvex Workspace'}</h1>
          <p>Multi-Tenant Invoicing Service</p>
        </div>
        <div class="invoice-info">
          <h2>${typeTitle}</h2>
          <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString()}</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
        </div>
      </div>

      <div class="parties">
        <div class="party">
          <h3>Billed To</h3>
          <p><strong>${invoice.client?.name || 'Valued Client'}</strong></p>
          <p>${invoice.client?.email || ''}</p>
          ${invoice.client?.phone ? `<p>${invoice.client.phone}</p>` : ''}
          ${invoice.client?.billingAddress ? `<p>${invoice.client.billingAddress}</p>` : ''}
          ${invoice.client?.gstin ? `<p><strong>GSTIN:</strong> ${invoice.client.gstin}</p>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="amount" style="width: 80px;">Qty</th>
            <th class="amount" style="width: 120px;">Rate</th>
            <th class="amount" style="width: 120px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="bottom-section">
        
        {/* UPI QR Billing scan block */}
        <div className="smart-features-box">
          <div class="qr-code-wrapper">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(invoice.qrCodeString || '')}" alt="UPI QR to Pay" width="60" height="60" />
            <div class="qr-code-details">
              <h4>Scan to Pay</h4>
              <p>Dynamic UPI Generation<br>Supports standard apps (BHIM, GPay, Paytm)</p>
            </div>
          </div>
        </div>

        {/* Dynamic Totals */}
        <div class="totals">
          <table>
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td class="amount">${formatCurrency(invoice.subtotal)}</td>
              </tr>
              ${discountRow}
              ${taxesHTML}
              <tr class="total-row">
                <td>Total Due (${invoice.currency})</td>
                <td class="amount">${formatCurrency(invoice.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>

      ${invoice.ewayBill ? `
        <div class="eway-bill-section" style="margin-top: 30px; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; font-size: 11px; line-height: 1.4;">
          <h4 style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; color: #000; font-weight: 800; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">E-Way Bill Transport details</h4>
          <table style="width: 100%; border-collapse: collapse; margin: 0; font-size: 11px;">
            <tr style="border-bottom: none;">
              <td style="padding: 4px 0; font-weight: 800; width: 140px; border-bottom: none;">E-Way Bill Number:</td>
              <td style="padding: 4px 0; border-bottom: none; font-family: monospace; font-size: 12px; font-weight: bold;">${invoice.ewayBill.ewayBillNo}</td>
              <td style="padding: 4px 0; font-weight: 800; width: 140px; border-bottom: none;">Transport Status:</td>
              <td style="padding: 4px 0; border-bottom: none; font-weight: bold; color: #1E293B;">${invoice.ewayBill.status}</td>
            </tr>
            <tr style="border-bottom: none;">
              <td style="padding: 4px 0; font-weight: 800; border-bottom: none;">Transporter Name:</td>
              <td style="padding: 4px 0; border-bottom: none;">${invoice.ewayBill.transporterName}</td>
              <td style="padding: 4px 0; font-weight: 800; border-bottom: none;">Transporter ID:</td>
              <td style="padding: 4px 0; border-bottom: none; font-family: monospace;">${invoice.ewayBill.transporterId}</td>
            </tr>
            <tr style="border-bottom: none;">
              <td style="padding: 4px 0; font-weight: 800; border-bottom: none;">Vehicle Number:</td>
              <td style="padding: 4px 0; border-bottom: none; font-family: monospace;">${invoice.ewayBill.vehicleNo}</td>
              <td style="padding: 4px 0; font-weight: 800; border-bottom: none;">Mode / Distance:</td>
              <td style="padding: 4px 0; border-bottom: none;">${invoice.ewayBill.transportMode} / ${invoice.ewayBill.distanceKm} KM</td>
            </tr>
            <tr style="border-bottom: none;">
              <td style="padding: 4px 0; font-weight: 800; border-bottom: none;">Dispatch Location:</td>
              <td style="padding: 4px 0; border-bottom: none;">${invoice.ewayBill.dispatchLocation}</td>
              <td style="padding: 4px 0; font-weight: 800; border-bottom: none;">Delivery Location:</td>
              <td style="padding: 4px 0; border-bottom: none;">${invoice.ewayBill.deliveryLocation}</td>
            </tr>
          </table>
        </div>
      ` : ''}

      ${invoice.notes ? `
        <div class="notes">
          <h4>Notes / Payment Instructions</h4>
          <p>${invoice.notes}</p>
        </div>
      ` : ''}

      {/* Cryptographic Digital E-Signature Seal */}
      <div class="signature-seal-box">
        <p>SECURED CRYPTOGRAPHIC E-SIGNATURE SEAL</p>
        <p class="seal-hash">${invoice.signatureString || 'N/A'}</p>
      </div>

      <div class="footer">
        <p>Thank you for your business!</p>
        <p>Powered by Kaasvex SaaS Operating System</p>
      </div>
    </body>
    </html>
  `;
};