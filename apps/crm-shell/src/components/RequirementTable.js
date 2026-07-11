import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const RequirementTable = ({ requirements, onEdit, onDelete, onView }) => {
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'Draft':
        return 'badge-draft'; // grey badge
      case 'Review':
        return 'badge-under-review'; // yellow badge
      case 'Approved':
        return 'badge-converted'; // green badge
      case 'Blocked':
        return 'badge-lost'; // red/pink badge
      default:
        return 'badge-default';
    }
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>REQUIREMENT</th>
            <th>ACCOUNT</th>
            <th>CATEGORY</th>
            <th>PRIORITY</th>
            <th>STATUS</th>
            <th>OWNER</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((req) => (
            <tr key={req.id}>
              <td style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => onView(req)}>{req.id_str}</td>
              <td style={{ fontWeight: 500, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => onView(req)}>{req.name}</td>
              <td>{req.account}</td>
              <td>{req.category}</td>
              <td>{req.priority}</td>
              <td>
                <span className={`badge ${getBadgeStyle(req.status)}`}>
                  {req.status}
                </span>
              </td>
              <td>{req.owner}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <button className="icon-button-small" onClick={() => onEdit(req)}><Edit2 size={14} /></button>
                  <button className="icon-button-small" onClick={() => onDelete(req)}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RequirementTable;
