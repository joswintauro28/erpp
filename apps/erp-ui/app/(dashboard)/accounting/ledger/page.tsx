"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { Search, Download, Calendar } from "lucide-react";
import accountingService from "@/services/accountingService";

interface LedgerEntry {
  date?: string;
  account: string;
  description?: string;
  debit: number;
  credit: number;
  balance: number;
  ref_type: string;
  ref_id: number;
}

export default function GeneralLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [account, setAccount] = useState("");
  
  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await accountingService.getLedger({ search, account });
      setEntries(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const handleSearch = () => {
    fetchLedger();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const exportCSV = () => {
    const headers = ["Date", "Account", "Description", "Debit", "Credit", "Balance"];
    const rows = (entries || []).map((e: LedgerEntry) => [
      e.date ? new Date(e.date).toLocaleDateString() : "",
      e.account,
      `"${e.description || ""}"`,
      e.debit || 0,
      e.credit || 0,
      e.balance !== null ? e.balance : ""
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...(rows || []).map((r: any) => r.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "general_ledger.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const money = (v: number | undefined | null) => v ? `₹${Number(v).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-';

  return (
    <div>
      <div className="page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--foreground)' }}>General Ledger</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginTop: '4px' }}>Complete history of all double-entry financial transactions</p>
        </div>
        <Button variant="outline" onClick={exportCSV}><Download size={16} style={{ marginRight: 8 }} /> Export CSV</Button>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        <CardContent style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: '6px' }}>Search Description</label>
            <Input 
              icon={Search} 
              placeholder="Search by vendor, invoice..." 
              value={search} 
              onChange={(e: any) => setSearch(e.target.value)} 
              onKeyDown={handleKeyDown} 
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--muted-foreground)', marginBottom: '6px' }}>Filter by Account</label>
            <select 
              value={account} 
              onChange={(e: any) => setAccount(e.target.value)}
              style={{ width: '100%', height: '36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0 12px', background: 'var(--background)', color: 'var(--foreground)', fontSize: '14px' }}
            >
              <option value="">All Accounts</option>
              <option value="Accounts Receivable">Accounts Receivable</option>
              <option value="Accounts Payable">Accounts Payable</option>
              <option value="Sales Revenue">Sales Revenue</option>
              <option value="Cash/Bank">Cash/Bank</option>
              <option value="Expense">Expenses (All)</option>
            </select>
          </div>
          <Button onClick={handleSearch}>Filter</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '40px 0' }}><Spinner size="lg" message="Loading ledger..." /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead style={{ textAlign: 'right' }}>Debit</TableHead>
                    <TableHead style={{ textAlign: 'right' }}>Credit</TableHead>
                    {account && <TableHead style={{ textAlign: 'right' }}>Balance</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(entries || []).map((entry: LedgerEntry, idx: number) => {
                    const badgeVariant = entry.ref_type === 'invoice' ? 'default' : entry.ref_type === 'payment' ? 'success' : 'warning';
                    return (
                      <TableRow key={`${entry.ref_type}-${entry.ref_id}-${idx}`}>
                        <TableCell>{entry.date ? new Date(entry.date).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant}>
                            {entry.ref_type}
                          </Badge>
                        </TableCell>
                        <TableCell style={{ fontWeight: 500 }}>{entry.account}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell style={{ textAlign: 'right', color: entry.debit > 0 ? 'inherit' : 'var(--muted-foreground)' }}>{money(entry.debit)}</TableCell>
                        <TableCell style={{ textAlign: 'right', color: entry.credit > 0 ? 'inherit' : 'var(--muted-foreground)' }}>{money(entry.credit)}</TableCell>
                        {account && <TableCell style={{ textAlign: 'right', fontWeight: 600 }}>{money(entry.balance)}</TableCell>}
                      </TableRow>
                    );
                  })}
                  {entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={account ? 7 : 6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted-foreground)' }}>
                        No ledger entries found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
