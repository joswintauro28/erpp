import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
import reportsService from "../services/reportsService";
import Input from "../components/ui/Input";

const TABS = ["Profit & Loss", "Balance Sheet", "Cash Flow", "Trial Balance"];
const PERIODS = [
  "Today", "This Week", "This Month", "This Quarter", "This Year",
  "Last Month", "Last Quarter", "Last Year", "All Time", "Custom Date Range"
];

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPeriodRange = (period) => {
  const now = new Date();
  let start, end;
  
  if (period === "Today") {
    start = end = new Date();
  } else if (period === "This Week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    start = new Date(now.setDate(diff));
    end = new Date(start);
    end.setDate(end.getDate() + 6);
  } else if (period === "This Month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (period === "This Quarter") {
    const q = Math.floor(now.getMonth() / 3);
    start = new Date(now.getFullYear(), q * 3, 1);
    end = new Date(now.getFullYear(), q * 3 + 3, 0);
  } else if (period === "This Year") {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);
  } else if (period === "Last Month") {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (period === "Last Quarter") {
    const q = Math.floor(now.getMonth() / 3) - 1;
    start = new Date(now.getFullYear(), q * 3, 1);
    end = new Date(now.getFullYear(), q * 3 + 3, 0);
  } else if (period === "Last Year") {
    start = new Date(now.getFullYear() - 1, 0, 1);
    end = new Date(now.getFullYear() - 1, 11, 31);
  } else if (period === "All Time") {
    return { start: "", end: "" };
  } else {
    return null;
  }

  return { start: formatDate(start), end: formatDate(end) };
};

const getPreviousPeriodRange = (period, customStart, customEnd) => {
  const currentRange = period === "Custom Date Range" ? { start: customStart, end: customEnd } : getPeriodRange(period);
  if (!currentRange || !currentRange.start || !currentRange.end) return null;

  const start = new Date(currentRange.start);
  const end = new Date(currentRange.end);
  const duration = end.getTime() - start.getTime();

  let prevStart, prevEnd;

  if (period === "This Month" || period === "Last Month") {
    prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
    prevEnd = new Date(start.getFullYear(), start.getMonth(), 0);
  } else if (period === "This Quarter" || period === "Last Quarter") {
    prevStart = new Date(start.getFullYear(), start.getMonth() - 3, 1);
    prevEnd = new Date(start.getFullYear(), start.getMonth(), 0);
  } else if (period === "This Year" || period === "Last Year") {
    prevStart = new Date(start.getFullYear() - 1, 0, 1);
    prevEnd = new Date(start.getFullYear() - 1, 11, 31);
  } else {
    // For Today, This Week, or Custom: subtract exact duration
    prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000); // 1 day before start
    prevStart = new Date(prevEnd.getTime() - duration);
  }

  return { start: formatDate(prevStart), end: formatDate(prevEnd) };
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState("Profit & Loss");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [kpiData, setKpiData] = useState(null);
  const [prevKpiData, setPrevKpiData] = useState(null);
  const [chartData, setChartData] = useState([]);
  
  // Date filtering state
  const [period, setPeriod] = useState("This Month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    if (period === "Custom Date Range" && (!customStart || !customEnd)) {
      return; // Do not auto-fetch until both dates are selected
    }
    fetchReport();
  }, [activeTab, period, customStart, customEnd]);

  const fetchReport = async () => {
    setLoading(true);
    setData(null); // Clear previous tab's data to prevent shape mismatch crashes
    
    let range = getPeriodRange(period);
    if (period === "Custom Date Range") {
      range = { start: customStart, end: customEnd };
    }
    
    const params = { start_date: range.start, end_date: range.end };
    
    // Previous period logic
    const prevRange = getPreviousPeriodRange(period, customStart, customEnd);
    const prevParams = prevRange ? { start_date: prevRange.start, end_date: prevRange.end } : {};

    try {
      // 1. Fetch data for the active tab
      let res;
      if (activeTab === "Profit & Loss") res = await reportsService.getProfitLoss(params);
      else if (activeTab === "Balance Sheet") res = await reportsService.getBalanceSheet(params);
      else if (activeTab === "Cash Flow") res = await reportsService.getCashFlow(params);
      else if (activeTab === "Trial Balance") res = await reportsService.getTrialBalance(params);
      setData(res.data);

      // 2. Fetch concurrent KPI and Chart data
      const [plRes, bsRes, prevPlRes, prevBsRes, chartsRes] = await Promise.all([
        reportsService.getProfitLoss(params),
        reportsService.getBalanceSheet(params),
        prevRange ? reportsService.getProfitLoss(prevParams) : Promise.resolve({ data: null }),
        prevRange ? reportsService.getBalanceSheet(prevParams) : Promise.resolve({ data: null }),
        reportsService.getCharts(params)
      ]);

      setKpiData({
        pl: plRes.data,
        bs: bsRes.data
      });
      setPrevKpiData({
        pl: prevPlRes.data,
        bs: prevBsRes.data
      });
      setChartData(chartsRes.data);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const money = (v) => v !== undefined ? `₹${Number(v).toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-';

  const exportPDF = async () => {
    try {
      let range = getPeriodRange(period);
      if (period === "Custom Date Range") {
        range = { start: customStart, end: customEnd };
      }
      const params = { start_date: range?.start || "", end_date: range?.end || "" };

      const tabMap = {
        "Profit & Loss": { fn: reportsService.exportProfitLossPDF, name: "profit_loss" },
        "Balance Sheet": { fn: reportsService.exportBalanceSheetPDF, name: "balance_sheet" },
        "Cash Flow": { fn: reportsService.exportCashFlowPDF, name: "cash_flow" },
        "Trial Balance": { fn: reportsService.exportTrialBalancePDF, name: "trial_balance" },
      };
      const selected = tabMap[activeTab];
      if (!selected) return;

      const res = await selected.fn(params);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selected.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed. Please try again.");
    }
  };

  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const renderKPI = (title, current, previous) => {
    const growth = calculateGrowth(current, previous);
    const isPositive = growth >= 0;
    return (
      <Card>
        <CardContent style={{ padding: '24px' }}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', fontWeight: 500 }}>{title}</p>
          <h3 style={{ fontSize: '24px', fontWeight: 600, marginTop: '8px' }}>{money(current)}</h3>
          {prevKpiData && (
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px', fontSize: '14px', color: isPositive ? 'var(--success)' : 'var(--destructive)' }}>
              {isPositive ? <TrendingUp size={16} style={{ marginRight: 4 }} /> : <TrendingDown size={16} style={{ marginRight: 4 }} />}
              <span style={{ fontWeight: 500 }}>{Math.abs(growth).toFixed(1)}%</span>
              <span style={{ color: 'var(--muted-foreground)', marginLeft: '6px' }}>vs prev</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const SectionHeader = ({ title }) => (
    <div style={{ fontWeight: 600, fontSize: '16px', marginTop: '24px', marginBottom: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
      {title}
    </div>
  );

  const RowLine = ({ label, amount, isTotal = false, isIndented = false, color = "inherit", isCurrency = true }) => (
    <div style={{ 
      display: 'flex', justifyContent: 'space-between', padding: '8px 0', 
      fontWeight: isTotal ? 600 : 400, 
      fontSize: isTotal ? '15px' : '14px',
      color: isIndented ? 'var(--muted-foreground)' : 'var(--foreground)',
      marginLeft: isIndented ? '16px' : '0'
    }}>
      <span>{label}</span>
      <span style={{ color }}>{isCurrency ? money(amount) : amount}</span>
    </div>
  );

  const renderProfitLoss = () => {
    if (!data) return null;
    const dateStr = period === "Custom Date Range" ? `${customStart} to ${customEnd}` : period;
    return (
      <div style={{ maxWidth: 800 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Profit & Loss Statement</h2>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginBottom: '24px' }}>Income statement for {dateStr}</p>

        <SectionHeader title="Revenue" />
        {data.revenue?.map((r, i) => <RowLine key={i} label={r.name} amount={r.amount} isIndented />)}
        <RowLine label="Total Revenue" amount={data.total_revenue} isTotal />

        <SectionHeader title="Cost of Goods Sold" />
        {data.cogs?.map((c, i) => <RowLine key={i} label={c.name} amount={c.amount} isIndented />)}
        <RowLine label="Total COGS" amount={data.total_cogs} isTotal />

        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--muted)', borderRadius: '8px' }}>
          <RowLine label="Gross Profit" amount={data.gross_profit} isTotal color={data.gross_profit >= 0 ? "var(--success)" : "var(--destructive)"} />
        </div>

        <SectionHeader title="Operating Expenses" />
        {data.operating_expenses?.map((e, i) => <RowLine key={i} label={e.name} amount={e.amount} isIndented />)}
        <RowLine label="Total Operating Expenses" amount={data.total_operating} isTotal />

        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--muted)', borderRadius: '8px' }}>
          <RowLine label="Net Profit" amount={data.net_profit} isTotal color={data.net_profit >= 0 ? "var(--success)" : "var(--destructive)"} />
          <RowLine label="Net Profit Margin" amount={`${Number(data.net_profit_margin || 0).toFixed(2)}%`} isIndented isCurrency={false} />
        </div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    if (!data) return null;
    const range = period === "Custom Date Range" ? { start: customStart, end: customEnd } : getPeriodRange(period);
    const dateStr = period === "Custom Date Range" ? `${customStart} to ${customEnd}` : period;
    
    return (
      <div style={{ maxWidth: 800 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Balance Sheet</h2>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginBottom: '24px' }}>As of {range?.end || 'Today'}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Assets</h3>
            <SectionHeader title="Current Assets" />
            {data?.assets?.current?.map((a, i) => <RowLine key={i} label={a.name} amount={a.amount} isIndented />)}
            <RowLine label="Total Current Assets" amount={data?.assets?.total_current || 0} isTotal />
            
            <SectionHeader title="Fixed Assets" />
            {data?.assets?.fixed?.map((a, i) => <RowLine key={i} label={a.name} amount={a.amount} isIndented />)}
            {(!data?.assets?.fixed || data.assets.fixed.length === 0) && <RowLine label="No fixed assets" amount={0} isIndented />}
            <RowLine label="Total Fixed Assets" amount={data?.assets?.total_fixed || 0} isTotal />

            <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '2px solid var(--border)' }}>
              <RowLine label="Total Assets" amount={data?.assets?.total || 0} isTotal />
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Liabilities & Equity</h3>
            <SectionHeader title="Current Liabilities" />
            {data?.liabilities?.current?.map((l, i) => <RowLine key={i} label={l.name} amount={l.amount} isIndented />)}
            <RowLine label="Total Current Liabilities" amount={data?.liabilities?.total_current || 0} isTotal />

            <SectionHeader title="Long-term Liabilities" />
            {data?.liabilities?.long_term?.map((l, i) => <RowLine key={i} label={l.name} amount={l.amount} isIndented />)}
            {(!data?.liabilities?.long_term || data.liabilities.long_term.length === 0) && <RowLine label="No long-term debt" amount={0} isIndented />}
            <RowLine label="Total Long-term Liabilities" amount={data?.liabilities?.total_long_term || 0} isTotal />

            <div style={{ marginTop: '16px' }}>
              <RowLine label="Total Liabilities" amount={data?.liabilities?.total || 0} isTotal />
            </div>

            <SectionHeader title="Equity" />
            {data?.equity?.items?.map((e, i) => <RowLine key={i} label={e.name} amount={e.amount} isIndented />)}
            <RowLine label="Total Equity" amount={data?.equity?.total || 0} isTotal />

            <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '2px solid var(--border)' }}>
              <RowLine label="Total Liabilities & Equity" amount={(data?.liabilities?.total || 0) + (data?.equity?.total || 0)} isTotal />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCashFlow = () => {
    if (!data) return null;
    const dateStr = period === "Custom Date Range" ? `${customStart} to ${customEnd}` : period;

    return (
      <div style={{ maxWidth: 800 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Cash Flow Statement</h2>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginBottom: '24px' }}>For {dateStr}</p>

        <SectionHeader title="Operating Activities" />
        {data.operating_activities?.map((o, i) => <RowLine key={i} label={o.name} amount={o.amount} isIndented />)}
        <RowLine label="Cash from Operating Activities" amount={data.cash_from_operating} isTotal color={data.cash_from_operating >= 0 ? "var(--success)" : "var(--destructive)"} />

        <SectionHeader title="Investing Activities" />
        {data.investing_activities?.map((i, idx) => <RowLine key={idx} label={i.name} amount={i.amount} isIndented />)}
        {data.investing_activities?.length === 0 && <RowLine label="No investing activities" amount={0} isIndented />}
        <RowLine label="Cash from Investing Activities" amount={data.cash_from_investing} isTotal />

        <SectionHeader title="Financing Activities" />
        {data.financing_activities?.map((f, i) => <RowLine key={i} label={f.name} amount={f.amount} isIndented />)}
        {data.financing_activities?.length === 0 && <RowLine label="No financing activities" amount={0} isIndented />}
        <RowLine label="Cash from Financing Activities" amount={data.cash_from_financing} isTotal />

        <div style={{ marginTop: '32px', padding: '16px', backgroundColor: 'var(--muted)', borderRadius: '8px' }}>
          <RowLine label="Net Change in Cash" amount={data.net_change} isTotal color={data.net_change >= 0 ? "var(--success)" : "var(--destructive)"} />
          <RowLine label="Ending Cash Balance" amount={data.ending_balance} isTotal />
        </div>
      </div>
    );
  };

  const renderTrialBalance = () => {
    if (!data) return null;
    const range = period === "Custom Date Range" ? { start: customStart, end: customEnd } : getPeriodRange(period);
    return (
      <div style={{ maxWidth: 800 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Trial Balance</h2>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginBottom: '24px' }}>As of {range?.end || 'Today'}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', fontWeight: 600, borderBottom: '2px solid var(--border)', paddingBottom: '8px', marginBottom: '8px' }}>
          <div>Account</div>
          <div style={{ textAlign: 'right' }}>Debit</div>
          <div style={{ textAlign: 'right' }}>Credit</div>
        </div>

        {data.accounts?.map((acc, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div>{acc.account}</div>
            <div style={{ textAlign: 'right' }}>{acc.debit > 0 ? money(acc.debit) : '-'}</div>
            <div style={{ textAlign: 'right' }}>{acc.credit > 0 ? money(acc.credit) : '-'}</div>
          </div>
        ))}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', padding: '16px 0', fontWeight: 600, fontSize: '16px', marginTop: '8px' }}>
          <div>Totals</div>
          <div style={{ textAlign: 'right', color: data.balanced ? 'inherit' : 'var(--destructive)' }}>{money(data.total_debit)}</div>
          <div style={{ textAlign: 'right', color: data.balanced ? 'inherit' : 'var(--destructive)' }}>{money(data.total_credit)}</div>
        </div>
        
        {!data.balanced && (
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--destructive)', color: 'white', borderRadius: '6px', textAlign: 'center' }}>
            Warning: Trial Balance is out of balance!
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--foreground)' }}>Financial Reports</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginTop: '4px' }}>Generate and view financial statements</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            style={{ height: '36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0 12px', background: 'var(--background)' }}
          >
            {(PERIODS || []).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {period === "Custom Date Range" && (
            <>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ height: '36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0 12px', background: 'var(--background)' }} />
              <span style={{ alignSelf: 'center' }}>to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ height: '36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0 12px', background: 'var(--background)' }} />
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {(TABS || []).map(tab => (
          <Button 
            key={tab} 
            variant={activeTab === tab ? "default" : "outline"}
            onClick={() => setActiveTab(tab)}
            style={{ borderRadius: '20px' }}
          >
            {tab}
          </Button>
        ))}
      </div>

      {kpiData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {renderKPI("Total Revenue", kpiData.pl.total_revenue, prevKpiData?.pl?.total_revenue)}
          {renderKPI("Total Expenses", kpiData.pl.total_operating + kpiData.pl.total_cogs, prevKpiData?.pl?.total_operating + prevKpiData?.pl?.total_cogs)}
          {renderKPI("Net Profit", kpiData.pl.net_profit, prevKpiData?.pl?.net_profit)}
          {renderKPI("Cash Balance", kpiData.bs.assets.total_current, prevKpiData?.bs?.assets?.total_current)}
        </div>
      )}

      {chartData && chartData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <Card>
            <CardContent style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Revenue vs Expenses</h3>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val >= 1000 ? val/1000 + 'k' : val}`} />
                    <RechartsTooltip formatter={(val) => money(val)} cursor={{ fill: 'var(--muted)' }} />
                    <Legend />
                    <Bar dataKey="revenue" fill="var(--primary)" name="Revenue" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="var(--destructive)" name="Expenses" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Profit & Cash Trend</h3>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val >= 1000 ? val/1000 + 'k' : val}`} />
                    <RechartsTooltip formatter={(val) => money(val)} />
                    <Legend />
                    <Line type="monotone" dataKey="profit" stroke="var(--success)" name="Net Profit" strokeWidth={2} />
                    <Line type="monotone" dataKey="net_cash" stroke="var(--warning)" name="Net Cash Flow" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
             <Button variant="outline" onClick={exportPDF}><Download size={16} style={{ marginRight: 8 }} /> Export PDF</Button>
          </div>
          {loading ? (
            <div style={{ padding: '60px 0' }}><Spinner size="lg" message="Generating report..." /></div>
          ) : (
            <>
              {activeTab === "Profit & Loss" && renderProfitLoss()}
              {activeTab === "Balance Sheet" && renderBalanceSheet()}
              {activeTab === "Cash Flow" && renderCashFlow()}
              {activeTab === "Trial Balance" && renderTrialBalance()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
