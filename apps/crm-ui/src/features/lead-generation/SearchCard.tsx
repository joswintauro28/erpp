import React, { useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import AsyncSelect from 'react-select/async';
import './SearchCard.css';

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', color: '#9ca3af' }}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const DropdownIndicator = (props) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
      <SearchIcon />
    </div>
  );
};

const industryOptions = [
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Education', label: 'Education' },
  { value: 'Construction', label: 'Construction' },
  { value: 'Transportation', label: 'Transportation' },
  { value: 'Energy', label: 'Energy' },
  { value: 'Agriculture', label: 'Agriculture' },
  { value: 'Entertainment', label: 'Entertainment' },
  { value: 'Hospitality', label: 'Hospitality' },
  { value: 'Real Estate', label: 'Real Estate' },
];

interface SearchCardProps {
  onSearch: (searchParams: any) => void;
  loading: boolean;
  onStop: () => void;
  isStopped: boolean;
  onContinue?: () => void;
  onReset: () => void;
}

const SearchCard: React.FC<SearchCardProps> = ({ onSearch, loading, onStop, isStopped, onContinue, onReset }) => {
  const [searchMode, setSearchMode] = useState('parameters'); // 'parameters', 'company', or 'url'
  const [companyName, setCompanyName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [city, setCity] = useState(null);
  const [industry, setIndustry] = useState(null);
  const [searchBy, setSearchBy] = useState('Employees');
  const [minEmployees, setMinEmployees] = useState('200');
  const [minRevenue, setMinRevenue] = useState('100000');

  const handleGenerateReport = () => {
    onSearch({
      city: city ? city.value : '',
      industry: industry ? industry.value : '',
      company_name: searchMode === 'url' ? companyName : '',
      url: searchMode === 'url' ? targetUrl : '',
      mode: searchMode,
      searchBy,
      minEmployees,
      minRevenue,
      refresh: false
    });
  };

  const handleRefreshReport = () => {
    onSearch({
      city: city ? city.value : '',
      industry: industry ? industry.value : '',
      company_name: searchMode === 'url' ? companyName : '',
      url: searchMode === 'url' ? targetUrl : '',
      mode: searchMode,
      searchBy,
      minEmployees,
      minRevenue,
      refresh: true
    });
  };

  const loadCityOptions = async (inputValue) => {
    if (!inputValue) return [];
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputValue)}&count=10&language=en&format=json`);
      const data = await response.json();
      if (!data.results) return [];

      const uniqueCities = [];
      const seen = new Set();
      data.results.forEach(item => {
        const displayName = `${item.name}${item.admin1 ? `, ${item.admin1}` : ''}, ${item.country}`;
        if (!seen.has(displayName)) {
          seen.add(displayName);
          uniqueCities.push({
            value: item.name.toLowerCase(),
            label: displayName
          });
        }
      });
      return uniqueCities;
    } catch (error) {
      console.error("Error fetching cities:", error);
      return [];
    }
  };

  const defaultCityOptions = [
    // Top Indian Cities
    { value: 'mumbai', label: 'Mumbai, India' },
    { value: 'delhi', label: 'Delhi, India' },
    { value: 'bengaluru', label: 'Bengaluru, India' },
    { value: 'hyderabad', label: 'Hyderabad, India' },
    { value: 'chennai', label: 'Chennai, India' },
    { value: 'kolkata', label: 'Kolkata, India' },
    { value: 'pune', label: 'Pune, India' },
    { value: 'ahmedabad', label: 'Ahmedabad, India' },
    { value: 'mangalore', label: 'Mangalore, India' },
    { value: 'kochi', label: 'Kochi, India' },
    // North America
    { value: 'new york', label: 'New York, United States' },
    { value: 'los angeles', label: 'Los Angeles, United States' },
    { value: 'san francisco', label: 'San Francisco, United States' },
    { value: 'chicago', label: 'Chicago, United States' },
    { value: 'toronto', label: 'Toronto, Canada' },
    { value: 'vancouver', label: 'Vancouver, Canada' },
    // Europe
    { value: 'london', label: 'London, United Kingdom' },
    { value: 'paris', label: 'Paris, France' },
    { value: 'berlin', label: 'Berlin, Germany' },
    { value: 'amsterdam', label: 'Amsterdam, Netherlands' },
    { value: 'madrid', label: 'Madrid, Spain' },
    { value: 'rome', label: 'Rome, Italy' },
    // Asia & Middle East
    { value: 'tokyo', label: 'Tokyo, Japan' },
    { value: 'singapore', label: 'Singapore' },
    { value: 'dubai', label: 'Dubai, UAE' },
    { value: 'hong kong', label: 'Hong Kong' },
    { value: 'shanghai', label: 'Shanghai, China' },
    { value: 'seoul', label: 'Seoul, South Korea' },
    // Oceania & Others
    { value: 'sydney', label: 'Sydney, Australia' },
    { value: 'melbourne', label: 'Melbourne, Australia' },
    { value: 'auckland', label: 'Auckland, New Zealand' },
    { value: 'sao paulo', label: 'São Paulo, Brazil' },
    { value: 'cape town', label: 'Cape Town, South Africa' },
  ];

  const selectStyles = {
    menuPortal: base => ({ ...base, zIndex: 9999 }),
    control: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
      borderColor: state.isFocused ? 'var(--primary-color)' : 'var(--border-color)',
      boxShadow: state.isFocused ? 'var(--shadow-glow)' : 'none',
      '&:hover': {
        borderColor: 'var(--primary-color)',
        backgroundColor: 'rgba(255, 255, 255, 0.7)'
      },
      borderRadius: '12px',
      minHeight: '46px',
      padding: '0 4px',
      transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '0 8px'
    }),
    input: (base) => ({
      ...base,
      margin: '0',
      padding: '0'
    })
  };

  return (
    <div className="card glass-panel">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>Lead Generation Parameters</span>
        </div>
      </div>

      {/* Search Mode Toggle Switch */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', margin: '0 20px 20px 20px', paddingBottom: '10px', gap: '20px' }}>
        <button
          onClick={() => setSearchMode('parameters')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: searchMode === 'parameters' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: searchMode === 'parameters' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: '600',
            fontSize: '0.95rem',
            padding: '8px 4px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Discover by Location & Industry
        </button>
        <button
          onClick={() => setSearchMode('url')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: searchMode === 'url' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: searchMode === 'url' ? 'var(--primary-color)' : 'var(--text-secondary)',
            fontWeight: '600',
            fontSize: '0.95rem',
            padding: '8px 4px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Scrape & Analyze
        </button>
      </div>

      {searchMode === 'url' ? (
        <div className="search-form-grid" style={{ margin: '0 20px' }}>
          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label className="input-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <path d="M9 3v18"></path>
              </svg>
              Company Name
            </label>
            <input
              type="text"
              placeholder="Enter company name (e.g. Gurucharan Industries)"
              value={companyName}
              onChange={(e) => { setCompanyName(e.target.value); setTargetUrl(''); }}
              className="input-field"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                fontSize: '0.95rem',
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                outline: 'none',
                height: '46px',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary-color)';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                e.target.style.boxShadow = 'var(--shadow-glow)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-color)';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <div style={{ gridColumn: 'span 2', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '-5px 0' }}>
            — OR —
          </div>

          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label className="input-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              Website URL
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Enter website URL (e.g. https://gurucharanindia.com)"
              value={targetUrl}
              onChange={(e) => { setTargetUrl(e.target.value); setCompanyName(''); }}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                fontSize: '0.95rem',
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                outline: 'none',
                height: '46px',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary-color)';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                e.target.style.boxShadow = 'var(--shadow-glow)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-color)';
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
      ) : (
        <div className="search-form-grid">
          <div className="input-group">
            <label className="input-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              City
            </label>
            <AsyncSelect
              className="react-select-container"
              classNamePrefix="react-select"
              value={city}
              onChange={(selectedOption) => setCity(selectedOption)}
              loadOptions={loadCityOptions}
              defaultOptions={defaultCityOptions}
              placeholder="Search"
              components={{ DropdownIndicator, IndicatorSeparator: () => null }}
              menuPortalTarget={document.body}
              styles={selectStyles}
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                <line x1="4" y1="22" x2="4" y2="15"></line>
              </svg>
              Industry
            </label>
            <CreatableSelect
              className="react-select-container"
              classNamePrefix="react-select"
              value={industry}
              onChange={(selectedOption) => setIndustry(selectedOption)}
              options={industryOptions}
              isSearchable={true}
              placeholder="Search industry..."
              components={{ DropdownIndicator, IndicatorSeparator: () => null }}
              menuPortalTarget={document.body}
              styles={selectStyles}
            />
          </div>

        </div>
      )}

      <div className="search-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <p className="search-help-text" style={{ flex: '1', minWidth: '200px', margin: '0' }}>
          {searchMode === 'url' && "Enter a company name or URL to trigger targeted intelligence collection and AI capability analysis."}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {loading ? (
            <button
              onClick={onStop}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                transition: 'all 0.2s',
                height: '46px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              </svg>
              Stop Generation
            </button>
          ) : isStopped ? (
            <>
              <button
                onClick={onReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#6b7280',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  height: '46px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Reset Search
              </button>
              <button
                onClick={onContinue}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '46px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Continue Search
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleRefreshReport}
                disabled={searchMode === 'url' ? (!companyName.trim() && !targetUrl.trim()) : (!city || !industry)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
                </svg>
                Refresh Results
              </button>
              <button
                className="btn btn-primary"
                onClick={handleGenerateReport}
                disabled={searchMode === 'url' ? (!companyName.trim() && !targetUrl.trim()) : (!city || !industry)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Generate Report
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchCard;
