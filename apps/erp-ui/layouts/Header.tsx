import { useState, useRef, useEffect, ComponentType } from "react";
import { Search, Bell, LogOut, User, Settings, AlertTriangle, Clock, FileText, Package, Warehouse, Users, ClipboardList } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import productService from "../services/productService";
import invoiceService from "../services/invoiceService";
import quotationService from "../services/quotationService";
import notificationService from "../services/notificationService";
import api from "../services/api";
import "./Header.css";

interface NotificationItem {
  id: string | number;
  isRead?: boolean;
  message?: string;
  timestamp?: string;
  type: string;
  url?: string;
}

interface SearchResultItem {
  id: string | number;
  invoice_number?: string;
  client_name?: string;
  quote_number?: string;
  name?: string;
  sku?: string;
  stock?: number;
  [key: string]: unknown;
}

interface FlatSearchItem {
  id: string | number;
  type: string;
  url: string;
  label: string;
  icon: any;
  [key: string]: unknown;
}

interface SearchData {
  invoices?: SearchResultItem[];
  quotations?: SearchResultItem[];
  clients?: SearchResultItem[];
  products?: SearchResultItem[];
  stock?: SearchResultItem[];
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  // States
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchData | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const debouncedSearch = useDebounce(searchQuery, 250);

  // Refs
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flattened results for keyboard navigation
  const flatResults = useRef<FlatSearchItem[]>([]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data: { notifications?: NotificationItem[] } = await notificationService.getAlerts();
      setNotifications(data.notifications || []);
      setUnreadCount((data.notifications || []).filter((n: any) => !n.isRead).length);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNotifClick = (n: NotificationItem) => {
    notificationService.markAsRead(n.id);
    setShowNotif(false);
    fetchNotifications();
    router.push(n.url || "/");
  };

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead(notifications);
    fetchNotifications();
  };

  const getNotifIcon = (type: string) => {
    switch(type) {
      case 'overdue_invoice': return <AlertTriangle size={16} color="var(--destructive)" />;
      case 'invoice_due_soon': return <Clock size={16} color="var(--warning)" />;
      case 'low_stock': return <AlertTriangle size={16} color="var(--warning)" />;
      case 'quote_expiring': return <FileText size={16} color="var(--primary)" />;
      case 'payment_received': return <ClipboardList size={16} color="var(--success)" />;
      case 'new_client': return <Users size={16} color="var(--blue)" />;
      default: return <Bell size={16} />;
    }
  };

  // Handle Search Fetching
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.trim().length < 2) {
      setSearchResults(null);
      flatResults.current = [];
      setSelectedIndex(-1);
      return;
    }
    
    let isMounted = true;
    const fetchSearch = async () => {
      setIsSearching(true);
      try {
        const res = await api.get(`/search/global?q=${encodeURIComponent(debouncedSearch)}`);
        if (isMounted) {
          const data = res.data;
          setSearchResults(data);
          
          // Rebuild flat array for keyboard nav
          const arr: FlatSearchItem[] = [];
          (data.invoices || []).forEach((item: SearchResultItem) => arr.push({ ...item, type: 'invoice', url: `/billing/invoices/${item.id}`, label: `${item.invoice_number} (${item.client_name})`, icon: FileText }));
          (data.quotations || []).forEach((item: SearchResultItem) => arr.push({ ...item, type: 'quotation', url: `/billing/quotations?view=${item.id}`, label: `${item.quote_number} (${item.client_name})`, icon: ClipboardList }));
          (data.clients || []).forEach((item: SearchResultItem) => arr.push({ ...item, type: 'client', url: `/crm/clients/${item.id}`, label: `${item.name}`, icon: Users }));
          (data.products || []).forEach((item: SearchResultItem) => arr.push({ ...item, type: 'product', url: `/inventory/products?view=${item.id}`, label: `${item.name}`, icon: Package }));
          (data.stock || []).forEach((item: SearchResultItem) => arr.push({ ...item, type: 'stock', url: `/inventory/stock`, label: `${item.name} (Stock: ${item.stock})`, icon: Warehouse }));
          
          flatResults.current = arr;
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    };
    fetchSearch();
    return () => { isMounted = false; };
  }, [debouncedSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSearch(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSearch || flatResults.current.length === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev: any) => (prev < flatResults.current.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev: any) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < flatResults.current.length) {
        const selected = flatResults.current[selectedIndex];
        router.push(selected.url);
        setShowSearch(false);
        setSearchQuery("");
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowSearch(false);
      inputRef.current?.blur();
    }
  };

  const navigateTo = (url: string) => {
    router.push(url);
    setShowSearch(false);
    setSearchQuery("");
  };

  const initials = user?.logged_in_user_id ? `U${user.logged_in_user_id}` : "U";

  const renderSearchSection = (title: string, items: SearchResultItem[] | undefined, typeStr: string) => {
    if (!items || items.length === 0) return null;
    
    return (
      <div className="search-section">
        <div className="search-section-title">{title}</div>
        {(items || []).map((item: SearchResultItem) => {
          // Find the flat item index for selection
          const flatIndex = flatResults.current.findIndex((fi: any) => fi.id === item.id && fi.type === typeStr);
          const flatItem = flatResults.current[flatIndex];
          const isSelected = selectedIndex === flatIndex;
          
          if (!flatItem) return null;
          const Icon = flatItem.icon;
          
          return (
            <div 
              key={`${typeStr}-${item.id}`} 
              className={`search-item ${isSelected ? 'selected' : ''}`}
              onMouseEnter={() => setSelectedIndex(flatIndex)}
              onClick={() => navigateTo(flatItem.url)}
            >
              <Icon size={14} className="search-icon-color" />
              <span>{flatItem.label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <header className="header">
      <div className="header__search-container" ref={searchContainerRef}>
        <div className="header__search">
          <Search className="header__search-icon" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search invoices, clients, products..." 
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => { if (searchQuery.length > 0) setShowSearch(true); }}
            onKeyDown={handleKeyDown}
          />
          {isSearching && <div className="search-spinner" />}
        </div>
        
        {showSearch && searchQuery.trim().length >= 2 && (
          <div className="search-dropdown">
            {!searchResults ? (
              <div className="search-empty">Searching...</div>
            ) : flatResults.current.length === 0 ? (
              <div className="search-empty">No results found for "{searchQuery}"</div>
            ) : (
              <div className="search-results-list">
                {renderSearchSection("Invoices", searchResults.invoices, "invoice")}
                {renderSearchSection("Quotations", searchResults.quotations, "quotation")}
                {renderSearchSection("Clients", searchResults.clients, "client")}
                {renderSearchSection("Products", searchResults.products, "product")}
                {renderSearchSection("Stock", searchResults.stock, "stock")}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="header__actions">
        <div className="header__user" ref={notifRef}>
          <button className="header__notif-btn" onClick={() => setShowNotif(!showNotif)}>
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="header__notif-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          
          {showNotif && (
            <div className="header__dropdown notif-dropdown" style={{ right: 0, width: '350px', padding: 0, maxHeight: '450px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--border)' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Notifications</h4>
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer' }}>Mark all as read</button>
                )}
              </div>
              
              {notifications.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--muted-foreground)', textAlign: 'center', padding: '24px 0' }}>No new notifications</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {notifications.slice(0, 10).map((n: NotificationItem) => (
                    <div 
                      key={n.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start', 
                        gap: '12px', 
                        fontSize: '13px', 
                        padding: '12px', 
                        borderBottom: '1px solid var(--border)', 
                        cursor: 'pointer',
                        background: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.04)'
                      }}
                      className="hover-bg-muted"
                      onClick={() => handleNotifClick(n)}
                    >
                      <div style={{ marginTop: '2px' }}>{getNotifIcon(n.type)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: n.isRead ? 400 : 500, color: 'var(--foreground)' }}>{n.message}</div>
                        {n.timestamp && <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px' }}>{new Date(n.timestamp).toLocaleDateString()}</div>}
                      </div>
                      {!n.isRead && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', marginTop: '4px' }} />}
                    </div>
                  ))}
                </div>
              )}
              <div 
                style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid var(--border)', fontSize: '13px', color: 'var(--primary)', cursor: 'pointer', background: 'var(--muted)' }}
                onClick={() => { setShowNotif(false); router.push('/notifications'); }}
              >
                View All Notifications
              </div>
            </div>
          )}
        </div>

        <div className="header__user" ref={profileRef}>
          <button className="header__user-btn" onClick={() => setShowProfile(!showProfile)}>
            <div className="header__avatar">{initials}</div>
          </button>

          {showProfile && (
            <div className="header__dropdown">
              <button className="header__dropdown-item" onClick={() => { setShowProfile(false); router.push('/profile'); }}>
                <User size={16} /> My Profile
              </button>
              <button className="header__dropdown-item" onClick={() => { setShowProfile(false); router.push('/settings'); }}>
                <Settings size={16} /> Settings
              </button>
              <div className="header__dropdown-sep" />
              <button className="header__dropdown-item danger" onClick={logout}>
                <LogOut size={16} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
