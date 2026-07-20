"use client";

import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const LeadTable = ({ leads, onEdit, onDelete, onView }) => {
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'New':
        return 'badge-new';
      case 'Qualified':
        return 'badge-qualified';
      case 'In Progress':
        return 'badge-in-progress';
      case 'Converted':
        return 'badge-converted';
      case 'Lost':
        return 'badge-lost';
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
            <th>LEAD</th>
            <th>COMPANY</th>
            <th>SOURCE</th>
            <th>EST. VALUE</th>
            <th>OWNER</th>
            <th>UPDATED</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => onView(lead)}>{lead.id_str}</td>
              <td style={{ fontWeight: 500, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => onView(lead)}>{lead.name}</td>
              <td>{lead.company}</td>
              <td>{lead.source}</td>
              <td>{formatCurrency(lead.est_value)}</td>
              <td>{lead.owner}</td>
              <td style={{ color: 'var(--text-muted)' }}>{lead.updated_at}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <button className="icon-button-small" onClick={() => onEdit(lead)}><Edit2 size={14} /></button>
                  <button className="icon-button-small" onClick={() => onDelete(lead)}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeadTable;
