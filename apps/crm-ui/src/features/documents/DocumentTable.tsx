"use client";

import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const DocumentTable = ({ documents, onEdit, onDelete, onView }) => {
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'Draft':
        return 'badge-draft';
      case 'Under Review':
        return 'badge-under-review';
      case 'Signed':
        return 'badge-signed';
      case 'Expired':
        return 'badge-expired';
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
            <th>DOCUMENT</th>
            <th>TYPE</th>
            <th>ACCOUNT</th>
            <th>SIZE</th>
            <th>STATUS</th>
            <th>OWNER</th>
            <th>UPDATED</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id}>
              <td style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => onView(doc)}>{doc.id_str}</td>
              <td style={{ fontWeight: 500, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => onView(doc)}>{doc.title}</td>
              <td>{doc.type}</td>
              <td>{doc.account}</td>
              <td>{doc.size}</td>
              <td>
                <span className={`badge ${getBadgeStyle(doc.status)}`}>
                  {doc.status}
                </span>
              </td>
              <td>{doc.owner}</td>
              <td style={{ color: 'var(--text-muted)' }}>{doc.updated_at}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <button className="icon-button-small" onClick={() => onEdit(doc)}><Edit2 size={14} /></button>
                  <button className="icon-button-small" onClick={() => onDelete(doc)}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DocumentTable;
