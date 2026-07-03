import { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/Card";
import notificationService from "../services/notificationService";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { AlertTriangle, Clock, FileText, Package, Users, ClipboardList, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getAlerts();
      setNotifications(data.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead(notifications);
    fetchNotifications();
  };

  const handleClick = (n) => {
    notificationService.markAsRead(n.id);
    navigate(n.url);
  };

  const getNotifIcon = (type) => {
    switch(type) {
      case 'overdue_invoice': return <AlertTriangle size={20} color="var(--destructive)" />;
      case 'invoice_due_soon': return <Clock size={20} color="var(--warning)" />;
      case 'low_stock': return <AlertTriangle size={20} color="var(--warning)" />;
      case 'quote_expiring': return <FileText size={20} color="var(--primary)" />;
      case 'payment_received': return <ClipboardList size={20} color="var(--success)" />;
      case 'new_client': return <Users size={20} color="var(--blue)" />;
      default: return <FileText size={20} />;
    }
  };

  if (loading) return <Spinner size="lg" message="Loading notifications..." />;

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Notifications</h1>
          <p>View your alerts and business updates</p>
        </div>
        <Button variant="outline" onClick={handleMarkAllRead}>
          <CheckCircle2 size={16} /> Mark All as Read
        </Button>
      </div>

      <Card>
        <CardContent style={{ padding: 0 }}>
          {notifications.length === 0 ? (
            <div className="page__empty" style={{ padding: '60px 0' }}>
              <CheckCircle2 size={48} color="var(--success)" />
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {(notifications || []).map(n => (
                <div 
                  key={n.id} 
                  onClick={() => handleClick(n)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px', 
                    padding: '16px 24px', 
                    borderBottom: '1px solid var(--border)', 
                    cursor: 'pointer',
                    background: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.04)',
                    transition: 'background 0.2s'
                  }}
                  className="hover-bg-muted"
                >
                  <div style={{ background: 'var(--background)', padding: '8px', borderRadius: '50%', border: '1px solid var(--border)' }}>
                    {getNotifIcon(n.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: n.isRead ? 500 : 600, color: 'var(--foreground)', fontSize: '15px' }}>
                      {n.message}
                    </div>
                    {n.timestamp && (
                      <div style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
                        {new Date(n.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                  {!n.isRead && (
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
