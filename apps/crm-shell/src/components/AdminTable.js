import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const AdminTable = ({ admins, onEdit, onDelete }) => {
  if (!admins || admins.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No admins found.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last Login</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.id}>
              <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>{admin.id_str}</td>
              <td style={{ fontWeight: 500 }}>{admin.name}</td>
              <td>{admin.email}</td>
              <td>{admin.role}</td>
              <td>
                <span className={`status-badge status-${admin.status.toLowerCase().replace(' ', '-')}`}>
                  {admin.status}
                </span>
              </td>
              <td style={{ color: 'var(--text-muted)' }}>{admin.last_login}</td>
              <td className="text-right">
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', color: 'var(--text-muted)' }}>
                  <button className="icon-button-small" onClick={() => onEdit(admin)}><Edit2 size={14} /></button>
                  {admin.role !== 'Super Admin' && (
                    <button className="icon-button-small" onClick={() => onDelete(admin)}><Trash2 size={14} /></button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminTable;
