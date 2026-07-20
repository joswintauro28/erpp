"use client";

import React, { useState, useRef, useEffect } from 'react';
import SearchCard from './SearchCard';
import ResultsCard from './ResultsCard';
import { api, getAccessToken } from '@/services/api';

export default function LeadDiscovery({ initialQuery, onImportComplete }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [pinnedLeads, setPinnedLeads] = useState([]);
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'pinned'
  const [filterText, setFilterText] = useState('');
  const [importing, setImporting] = useState(false);
  const abortControllerRef = useRef(null);

  const CRM_BASE = process.env.NEXT_PUBLIC_CRM_API_URL || 'http://127.0.0.1:8001';

  const getAuthHeaders = (): Record<string, string> => {
    const token = getAccessToken();
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  };

  const fetchPinnedLeads = async () => {
    try {
      const data = await api.get<any[]>('/lead-discovery/pinned');
      setPinnedLeads(data);
    } catch (err) {
      console.error("Failed to fetch pinned leads", err);
    }
  };

  useEffect(() => {
    fetchPinnedLeads();
  }, []);

  useEffect(() => {
    if (initialQuery && initialQuery.company_name) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (searchParams) => {
    setIsStopped(false);
    setLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const isUrlMode = searchParams.mode === 'url' && searchParams.url && searchParams.url.trim().length > 0;
      const endpoint = isUrlMode ? '/lead-discovery/scrape-url' : '/lead-discovery/search';
      const body = isUrlMode ? { url: searchParams.url } : {
        city: searchParams.city || null,
        industry: searchParams.industry || null,
        company_name: searchParams.company_name || null,
        searchBy: searchParams.searchBy || 'Employees',
        minEmployees: searchParams.minEmployees || '200',
        refresh: searchParams.refresh || false,
      };

      // Call the CRM service directly to avoid the Next.js proxy 60s timeout.
      // Long-running discovery/scrape operations can take 90-300s.
      const res = await fetch(`${CRM_BASE}/api${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!res.ok) {
        let errorMsg = `Server returned ${res.status}`;
        try {
          const text = await res.text();
          try {
            const errJson = JSON.parse(text);
            errorMsg = errJson.detail || errJson.message || errorMsg;
          } catch {
            errorMsg = `Server returned ${res.status}: ` + text.substring(0, 200);
          }
        } catch {}
        throw new Error(errorMsg);
      }

      let data = await res.json();

      if (isUrlMode) {
        data = {
          search: {
            company_name: data.company_name,
            city: data.public_contact?.address || '',
            industry: data.industry,
            mode: 'url',
            url: searchParams.url
          },
          companies: [data]
        };
      }

      setResults(data);
      setLoading(false);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Search request aborted.');
        return;
      }
      console.error('Error searching:', error);
      alert(`Failed to fetch leads: ${error.message}`);
      setLoading(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStopped(true);
    setLoading(false);
  };

  const handleReset = () => {
    setResults(null);
    setLoading(false);
    setIsStopped(false);
    setSelectedLeads([]);
  };

  const handleToggleSelect = (company) => {
    setSelectedLeads((prev) => {
      const isSelected = prev.some(c => c.company_name === company.company_name);
      if (isSelected) {
        return prev.filter(c => c.company_name !== company.company_name);
      } else {
        return [...prev, company];
      }
    });
  };

  const isPinned = (company) => {
    return pinnedLeads.some(c => c.company_name === company.company_name);
  };

  const togglePin = async (company) => {
    if (isPinned(company)) {
      setPinnedLeads((prev) => prev.filter(c => c.company_name !== company.company_name));
      try {
        await api.delete(`/lead-discovery/pinned/${encodeURIComponent(company.company_name)}`);
      } catch (err) {
        console.error("Failed to delete pin", err);
      }
    } else {
      setPinnedLeads((prev) => [...prev, company]);
      try {
        await api.post(`/lead-discovery/pinned`, company);
      } catch (err) {
        console.error("Failed to save pin", err);
      }
    }
  };

  const handleImport = async () => {
    if (selectedLeads.length === 0) return;
    setImporting(true);
    try {
      await api.post('/lead-discovery/import', { companies: selectedLeads });
      alert(`Successfully imported ${selectedLeads.length} leads!`);
      setSelectedLeads([]);
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (err) {
      console.error(err);
      alert('Error importing leads. Ensure backend is running.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="content" style={{ padding: '20px' }}>
      <div className="header-container">
        <h2>AI Lead Discovery</h2>
        <p>Discover and qualify B2B leads using AI.</p>
      </div>

      <SearchCard 
        onSearch={handleSearch} 
        loading={loading} 
        onStop={handleStop}
        isStopped={isStopped}
        onReset={handleReset}
      />
      
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <button 
          onClick={() => setActiveTab('search')}
          style={{ padding: '0.5rem 0.25rem', background: 'none', border: 'none', fontSize: '1rem', fontWeight: activeTab === 'search' ? '700' : '500', color: activeTab === 'search' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', borderBottom: activeTab === 'search' ? '2px solid var(--primary-color)' : '2px solid transparent' }}
        >
          Search Results {results && results.companies ? <span style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--badge-text)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem', marginLeft: '6px' }}>{results.companies.length}</span> : null}
        </button>
        <button 
          onClick={() => setActiveTab('pinned')}
          style={{ padding: '0.5rem 0.25rem', background: 'none', border: 'none', fontSize: '1rem', fontWeight: activeTab === 'pinned' ? '700' : '500', color: activeTab === 'pinned' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer', borderBottom: activeTab === 'pinned' ? '2px solid var(--primary-color)' : '2px solid transparent' }}
        >
          Pinned Pages {pinnedLeads.length > 0 ? <span style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--badge-text)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85rem', marginLeft: '6px' }}>{pinnedLeads.length}</span> : null}
        </button>
      </div>

      {activeTab === 'search' && !results && !loading && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          Enter a URL and click Search to discover leads.
        </div>
      )}
      
      {activeTab === 'search' && results && results.companies && (
        <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search generated results by company name or industry..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{ width: '100%', padding: '12px 14px 12px 38px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.95rem', backgroundColor: 'var(--bg-card-solid)', outline: 'none' }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
        </div>
      )}
      
      {activeTab === 'search' && results && results.companies && results.companies
        .filter(company => {
          if (!filterText.trim()) return true;
          const term = filterText.toLowerCase();
          return (
            (company.company_name && company.company_name.toLowerCase().includes(term)) ||
            (company.industry && company.industry.toLowerCase().includes(term))
          );
        })
        .map((company, index) => (
        <ResultsCard 
          key={index}
          company={company}
          allCompanies={results.companies}
          isPinned={isPinned}
          togglePin={togglePin}
          onBack={handleReset}
          isSelected={selectedLeads.some(c => c.company_name === company.company_name)}
          onToggleSelect={handleToggleSelect}
        />
      ))}

      {activeTab === 'pinned' && pinnedLeads.length === 0 && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          No pinned pages yet. Pin a result from the search tab to save it here.
        </div>
      )}

      {activeTab === 'pinned' && pinnedLeads
        .filter(company => {
          if (!filterText.trim()) return true;
          const term = filterText.toLowerCase();
          return (
            (company.company_name && company.company_name.toLowerCase().includes(term)) ||
            (company.industry && company.industry.toLowerCase().includes(term))
          );
        })
        .map((company, index) => (
        <ResultsCard 
          key={`pinned-${index}`}
          company={company}
          allCompanies={pinnedLeads}
          isPinned={isPinned}
          togglePin={togglePin}
          onBack={handleReset}
          isSelected={selectedLeads.some(c => c.company_name === company.company_name)}
          onToggleSelect={handleToggleSelect}
        />
      ))}

      {selectedLeads.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          zIndex: 1000,
          border: '1px solid var(--border-color)'
        }}>
          <span style={{ fontWeight: '500' }}>{selectedLeads.length} leads selected</span>
          <button 
            className="btn btn-primary" 
            onClick={handleImport}
            disabled={importing}
            style={{ padding: '8px 24px' }}
          >
            {importing ? 'Importing...' : 'Import Selected to Leads'}
          </button>
        </div>
      )}
    </div>
  );
}
