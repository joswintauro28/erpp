import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const QuotationTable = ({ quotations, onEdit, onDelete, onView }) => {
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'Draft':
        return 'badge-draft'; // grey badge
      case 'Sent':
        return 'badge-new'; // blue badge
      case 'Under Review':
        return 'badge-under-review'; // yellow badge
      case 'Accepted':
        return 'badge-converted'; // green badge
      case 'Rejected':
        return 'badge-lost'; // red badge
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
            <th>QUOTE #</th>
            <th>ACCOUNT</th>
            <th>VALUE</th>
            <th>VALID UNTIL</th>
            <th>STATUS</th>
            <th>OWNER</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {quotations.map((quote) => (
            <tr key={quote.id}>
              <td style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => onView(quote)}>{quote.id_str}</td>
              <td style={{ fontWeight: 500, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => onView(quote)}>{quote.quote_no}</td>
              <td>{quote.account}</td>
              <td>{formatCurrency(quote.value)}</td>
              <td>{quote.valid_until}</td>
              <td>
                <span className={`badge ${getBadgeStyle(quote.status)}`}>
                  {quote.status}
                </span>
              </td>
              <td>{quote.owner}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <button className="icon-button-small" onClick={() => onEdit(quote)}><Edit2 size={14} /></button>
                  <button className="icon-button-small" onClick={() => onDelete(quote)}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default QuotationTable;
