"use client";

import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const SalesOrderTable = ({ salesOrders, onView, onEdit, onDelete }) => {
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'Pending':
        return 'badge-under-review'; // yellow badge
      case 'Confirmed':
        return 'badge-qualified'; // teal badge
      case 'In Fulfillment':
        return 'badge-new'; // blue badge
      case 'Delivered':
        return 'badge-converted'; // green badge
      default:
        return 'badge-default';
    }
  };

  const formatCurrency = (value) => {
    const clean = parseFloat(String(value || '').replace(/[^0-9.]/g, ''));
    if (isNaN(clean)) return value || '';
    const hasInr = String(value || '').includes('₹') || String(value || '').includes('INR');
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: hasInr ? 'INR' : 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(clean);
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>SO #</th>
            <th>ACCOUNT</th>
            <th>FROM QUOTE</th>
            <th>VALUE</th>
            <th>ETA</th>
            <th>STATUS</th>
            <th>OWNER</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {salesOrders.map((so) => (
            <tr key={so.id}>
              <td style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => onView(so)}>{so.id_str}</td>
              <td style={{ fontWeight: 500, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => onView(so)}>{so.so_no}</td>
              <td>{so.account}</td>
              <td>{so.from_quote}</td>
              <td>{formatCurrency(so.value)}</td>
              <td>{so.eta}</td>
              <td>
                <span className={`badge ${getBadgeStyle(so.status)}`}>
                  {so.status}
                </span>
              </td>
              <td>{so.owner}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <button className="icon-button-small" onClick={() => onEdit(so)}><Edit2 size={14} /></button>
                  <button className="icon-button-small" onClick={() => onDelete(so)}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SalesOrderTable;
