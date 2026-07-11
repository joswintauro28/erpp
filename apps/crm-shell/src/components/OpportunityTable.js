import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const OpportunityTable = ({ opportunities, onEdit, onDelete, onView }) => {
  const getBadgeStyle = (stage) => {
    switch (stage) {
      case 'Discovery':
        return 'badge-new'; // reuse blue badge
      case 'Proposal':
        return 'badge-under-review'; // reuse yellow badge
      case 'Negotiation':
        return 'badge-qualified'; // reuse teal badge
      case 'Won':
        return 'badge-converted'; // reuse green badge
      case 'Lost':
        return 'badge-lost'; // reuse red badge
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
            <th>DEAL</th>
            <th>ACCOUNT</th>
            <th>VALUE</th>
            <th>PROBABILITY</th>
            <th>CLOSE DATE</th>
            <th>STAGE</th>
            <th>OWNER</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opp) => (
            <tr key={opp.id}>
              <td style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => onView(opp)}>{opp.id_str}</td>
              <td style={{ fontWeight: 500, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => onView(opp)}>{opp.name}</td>
              <td>{opp.account}</td>
              <td>{formatCurrency(opp.value)}</td>
              <td>{opp.probability}</td>
              <td>{opp.close_date}</td>
              <td>
                <span className={`badge ${getBadgeStyle(opp.stage)}`}>
                  {opp.stage}
                </span>
              </td>
              <td>{opp.owner}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <button className="icon-button-small" onClick={() => onEdit(opp)}><Edit2 size={14} /></button>
                  <button className="icon-button-small" onClick={() => onDelete(opp)}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OpportunityTable;
