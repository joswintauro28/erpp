import React, { useState } from 'react';
import './ResultsCard.css';

const ResultsCard = ({ company, allCompanies, togglePin, isPinned, onBack, isSelected, onToggleSelect }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isExpanded, setIsExpanded] = useState(false);

  if (!company) return null;

  const contact = company.public_contact || {};

  // Dynamic initials logo
  const initials = company.company_name
    ? company.company_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'CO';

  // Parse decision maker strings (Name (Title) or Name - Title)
  const parseDecisionMaker = (dmString) => {
    if (!dmString) return { name: 'Unknown', title: '' };

    // Check for "Name (Title)"
    const parenMatch = dmString.match(/(.*?)\((.*?)\)/);
    if (parenMatch) {
      return {
        name: parenMatch[1].trim(),
        title: parenMatch[2].trim()
      };
    }

    // Check for "Name - Title"
    if (dmString.includes('-')) {
      const parts = dmString.split('-');
      return {
        name: parts[0].trim(),
        title: parts.slice(1).join('-').trim()
      };
    }

    // Check for "Name: Title"
    if (dmString.includes(':')) {
      const parts = dmString.split(':');
      return {
        name: parts[0].trim(),
        title: parts.slice(1).join(':').trim()
      };
    }

    return { name: dmString.trim(), title: '' };
  };

  if (!isExpanded) {
    return (
      <div className="profile-dashboard-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', backgroundColor: 'var(--bg-card-solid)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div className="profile-logo-avatar" style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: 'var(--badge-bg)', color: 'var(--badge-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: '700' }}>
            {initials}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)' }}>{company.company_name}</h3>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{company.industry}</span>
              {company.location && (
                <>
                  <span>&bull;</span>
                  <span>{company.location}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {onToggleSelect && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(company)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary-color)' }}
              />
              <label style={{ fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer', color: 'var(--text-main)' }} onClick={() => onToggleSelect(company)}>Select</label>
            </div>
          )}
          <button className="btn-secondary" onClick={() => togglePin(company)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: isPinned(company) ? 'var(--badge-bg)' : 'transparent', color: isPinned(company) ? 'var(--badge-text)' : 'inherit', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={isPinned(company) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            {isPinned(company) ? 'Pinned' : 'Pin'}
          </button>
          <button className="btn-primary" onClick={() => setIsExpanded(true)} style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
            View Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-dashboard-card">
      {/* Header Panel with Navigation Actions */}
      <div className="profile-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <button className="btn-secondary" onClick={() => setIsExpanded(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--border-color)', backgroundColor: 'transparent', fontWeight: '600' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
          Minimize Details
        </button>

        {onToggleSelect && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', marginRight: '16px' }}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(company)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary-color)' }}
            />
            <label style={{ fontWeight: '500', color: 'var(--text-main)', cursor: 'pointer' }} onClick={() => onToggleSelect(company)}>Select for Import</label>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn-secondary"
            onClick={() => togglePin(company)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--border-color)', backgroundColor: isPinned(company) ? 'var(--badge-bg)' : 'transparent', color: isPinned(company) ? 'var(--badge-text)' : 'inherit', fontWeight: '600' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={isPinned(company) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            {isPinned(company) ? 'Pinned' : 'Pin Report'}
          </button>
          <button className="btn-primary" style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '0.9rem' }} onClick={() => window.print()}>
            Export PDF
          </button>
        </div>
      </div>

      {/* Quota warning banner */}
      {company.quota_warning && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          backgroundColor: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.4)',
          borderRadius: '10px', padding: '10px 16px', marginBottom: '1.25rem',
          fontSize: '0.875rem', color: 'var(--text-primary)'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span><strong>AI analysis unavailable:</strong> {company.quota_warning}</span>
        </div>
      )}

      {/* Main Company Summary Panel */}
      <div className="card profile-summary-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', backgroundColor: 'var(--bg-card-solid)' }}>
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
          <div className="profile-logo-avatar" style={{ width: '64px', height: '64px', borderRadius: '12px', backgroundColor: 'var(--badge-bg)', color: 'var(--badge-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '700' }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{company.company_name}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <span>{company.industry}</span>
              <span>&bull;</span>
              <span>{company.location}</span>
              {company.website && (
                <>
                  <span>&bull;</span>
                  <a href={company.website} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    {company.website.replace(/^https?:\/\/(www\.)?/, '')}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Profile Details Content */}
      <div className="profile-tab-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Overview & Industry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card-solid)' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Company Overview</h4>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>{company.company_overview || 'No company overview details available.'}</p>
          </div>
          <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card-solid)' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Industry & Business Niche</h4>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>{company.industry_details || 'Industry details have not been analyzed for this company.'}</p>
          </div>
        </div>

        {/* Corporate Contact & Google Search */}
        <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card-solid)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>Contact Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Corporate Email</span>
              {contact.email ? (
                <a href={`mailto:${contact.email}`} style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>{contact.email}</a>
              ) : (
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Unavailable</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Corporate Phone</span>
              {contact.phone ? (
                <a href={`tel:${contact.phone}`} style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>{contact.phone}</a>
              ) : (
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Unavailable</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Google Profile / Search</span>
              <a href={`https://www.google.com/search?q=${encodeURIComponent(company.company_name)}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500' }}>
                Search {company.company_name} on Google
              </a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Physical Address</span>
              {contact.address ? (
                <>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{contact.address}</span>
                  {/* Map iframe container */}
                  <div
                    onClick={() => {
                      const query = company.latitude && company.longitude
                        ? `${company.latitude},${company.longitude}`
                        : encodeURIComponent(contact.address);
                      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                    }}
                    style={{
                      marginTop: '8px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      position: 'relative',
                      height: '150px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                    }}
                  >
                    <iframe
                      title="map"
                      width="100%"
                      height="100%"
                      style={{ border: 0, pointerEvents: 'none' }}
                      loading="lazy"
                      allowFullScreen
                      src={
                        company.latitude && company.longitude
                          ? `https://maps.google.com/maps?q=${company.latitude},${company.longitude}&z=14&output=embed`
                          : `https://maps.google.com/maps?q=${encodeURIComponent(contact.address)}&z=14&output=embed`
                      }
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: '#ffffff',
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      fontWeight: '600'
                    }}>
                      Click to open in Google Maps
                    </div>
                  </div>
                </>
              ) : (
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Unavailable</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsCard;
