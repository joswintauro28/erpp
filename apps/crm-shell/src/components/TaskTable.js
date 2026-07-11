import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const TaskTable = ({ tasks, onEdit, onDelete, onView }) => {
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'Open': case 'Pending': case 'Scheduled': case 'In Progress': case 'Investigating':
        return 'badge-under-review'; // yellow
      case 'Closed': case 'Completed': case 'Done': case 'Resolved': case 'Confirmed':
        return 'badge-converted'; // green
      case 'Draft':
        return 'badge-draft'; // grey
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
            <th>RELATED TO</th>
            <th>DUE DATE</th>
            <th>STATUS</th>
            <th>OWNER</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((item) => (
            <tr key={item.id}>
              <td style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => onView(item)}>{item.id_str}</td>
              <td style={{ fontWeight: 500, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => onView(item)}>{item.title}</td>
              <td>{item.related_to}</td>
              <td>{item.due_date}</td>
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

export default TaskTable;
