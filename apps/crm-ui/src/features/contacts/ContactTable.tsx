"use client";

import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const ContactTable = ({ contacts, onEdit, onDelete, onView }) => {
  const getBadgeStyle = (type) => {
    switch (type) {
      case 'Primary':
        return 'badge-primary';
      case 'Decision':
        return 'badge-decision';
      case 'Influencer':
        return 'badge-influencer';
      case 'Inactive':
        return 'badge-inactive';
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
            <th>NAME</th>
            <th>ROLE</th>
            <th>ACCOUNT</th>
            <th>EMAIL</th>
            <th>PHONE</th>
            <th>TYPE</th>
            <th>LAST CONTACT</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr key={contact.id}>
              <td style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => onView(contact)}>{contact.id_str}</td>
              <td style={{ fontWeight: 500, color: 'var(--accent-primary)', cursor: 'pointer' }} onClick={() => onView(contact)}>{contact.name}</td>
              <td>{contact.role}</td>
              <td>{contact.account}</td>
              <td>{contact.email}</td>
              <td>{contact.phone}</td>
              <td>
                <span className={`badge ${getBadgeStyle(contact.type)}`}>
                  {contact.type}
                </span>
              </td>
              <td style={{ color: 'var(--text-muted)' }}>{contact.last_contact}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <button className="icon-button-small" onClick={() => onEdit(contact)}><Edit2 size={14} /></button>
                  <button className="icon-button-small" onClick={() => onDelete(contact)}><Trash2 size={14} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContactTable;
