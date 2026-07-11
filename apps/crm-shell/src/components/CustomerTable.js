import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const CustomerTable = ({ customers, onEdit, onDelete, onView }) => {
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'Active':
        return 'badge-active';
      case 'Prospect':
        return 'badge-prospect';
      case 'Dormant':
        return 'badge-dormant';
      case 'Churned':
        return 'badge-churned';
      default:
        return 'badge-default';
    }
  };

  const formatCurrency = (value) => {
    return `$${value / 1000}K`;
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>ACCOUNT</th>
            <th>INDUSTRY</th>
            <th>TIER</th>
            <th>ARR</th>
            <th>STATUS</th>
            <th>OWNER</th>
            <th>UPDATED</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => onView(customer)}>{customer.id_str}</td>
              <td style={{ fontWeight: 500, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => onView(customer)}>{customer.account}</td>
              <td>{customer.industry}</td>
              <td>{customer.tier}</td>
              <td>{formatCurrency(customer.arr)}</td>
              <td>
                <span className={`badge ${getBadgeStyle(customer.status)}`}>
                  {customer.status}
                </span>
              </td>
              <td>{customer.owner}</td>
              <td style={{ color: 'var(--text-muted)' }}>{customer.updated_at}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <button className="icon-button-small" onClick={() => onEdit(customer)}><Edit2 size={14} /></button>
                  <button className="icon-button-small" onClick={() => onDelete(customer)}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomerTable;
