import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const ReportTable = ({ reports, onEdit, onDelete, onView }) => {
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'Generating': case 'Processing': case 'Pending':
        return 'badge-under-review'; // yellow
      case 'Ready': case 'Success': case 'Completed':
        return 'badge-converted'; // green
      case 'Failed': case 'Error':
        return 'badge-lost'; // red
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
            <th>TITLE</th>
            <th>CATEGORY</th>
            <th>LAST RUN</th>
            <th>STATUS</th>
            <th>OWNER</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {reports.map((item) => (
            <tr key={item.id}>
              <td style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => onView(item)}>{item.id_str}</td>
              <td style={{ fontWeight: 500, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => onView(item)}>{item.title}</td>
              <td>{item.category}</td>
              <td>{item.last_run}</td>
              <td><span className={`badge ${getBadgeStyle(item.status)}`}>{item.status}</span></td>
              <td>{item.owner}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <button className="icon-button-small" onClick={() => onEdit(item)}><Edit2 size={14} /></button>
                  <button className="icon-button-small" onClick={() => onDelete(item)}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReportTable;
