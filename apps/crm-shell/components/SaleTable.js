import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const SaleTable = ({ sales, onEdit, onDelete, onView }) => {
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'Invoiced':
        return 'badge-new'; // blue badge
      case 'Confirmed':
        return 'badge-qualified'; // teal badge
      case 'Paid':
        return 'badge-converted'; // green badge
      case 'Overdue':
        return 'badge-lost'; // red badge
      case 'Draft':
        return 'badge-draft'; // grey badge (already exists for documents)
      default:
        return 'badge-default';
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>INVOICE #</th>
            <th>ACCOUNT</th>
            <th>AMOUNT</th>
            <th>ISSUED</th>
            <th>DUE</th>
            <th>STATUS</th>
            <th>REP</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id}>
              <td style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => onView(sale)}>{sale.id_str}</td>
              <td style={{ fontWeight: 500, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => onView(sale)}>{sale.invoice_no}</td>
              <td>{sale.account}</td>
              <td>{formatCurrency(sale.amount)}</td>
              <td>{sale.issued_date}</td>
              <td>{sale.due_date}</td>
              <td>
                <span className={`badge ${getBadgeStyle(sale.status)}`}>
                  {sale.status}
                </span>
              </td>
              <td>{sale.rep}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <button className="icon-button-small" onClick={() => onEdit(sale)}><Edit2 size={14} /></button>
                  <button className="icon-button-small" onClick={() => onDelete(sale)}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SaleTable;
