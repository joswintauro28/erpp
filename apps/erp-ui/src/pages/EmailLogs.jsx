import { useEffect, useState } from "react";
import { emailService } from "../services/emailService";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../components/ui/Table";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";

export default function EmailLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await emailService.getLogs();
      setLogs(res.data.data || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load email logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading) return <Spinner size="lg" message="Loading email logs..." />;
  if (error) return <div className="page__error">{error}</div>;

  return (
    <div>
      <div className="page__header">
        <div className="page__header-info">
          <h1>Email Logs</h1>
          <p>Track delivery status of your sent invoices</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery History</CardTitle>
          <CardDescription>Recent email delivery attempts</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-muted text-sm text-center" style={{ padding: 40 }}>No email logs found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logs || []).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </TableCell>
                    <TableCell>{log.invoice_number || "-"}</TableCell>
                    <TableCell>{log.recipient}</TableCell>
                    <TableCell>{log.subject}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === "sent" ? "success" : log.status === "not_configured" ? "warning" : "destructive"}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted" style={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {log.error || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
