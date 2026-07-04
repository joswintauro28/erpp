"use client";

import { useState, useEffect } from "react";
import portalApi from "@/services/portalApi";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";

const money = (v: any) => `Rs.${Number(v || 0).toLocaleString()}`;

export default function ClientPortalPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await portalApi.get("/payments");
        setPayments(res.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  return (
    <div>
      <div className="page__header" style={{ marginBottom: 32 }}>
        <div className="page__header-info">
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px 0' }}>Payments</h1>
          <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>View your payment history</p>
        </div>
      </div>

      <Card>
        <CardContent style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--muted-foreground)" }}>
                      No payment history found.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      <TableCell style={{ fontWeight: 500 }}>{p.invoice_number}</TableCell>
                      <TableCell style={{ fontWeight: 600 }}>{money(p.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{p.payment_method}</Badge>
                      </TableCell>
                      <TableCell>{p.reference_id || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
