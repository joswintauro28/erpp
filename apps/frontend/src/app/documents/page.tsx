"use client";

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FolderOpen, 
  Settings, 
  Activity, 
  History, 
  Terminal, 
  UploadCloud, 
  FileText, 
  Trash2, 
  Eye, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Database, 
  Layers, 
  Server, 
  Calendar,
  Layers3,
  HardDrive,
  Cpu,
  ArrowRight,
  TrendingUp,
  X
} from 'lucide-react';

interface DocumentVersion {
  id: string;
  version: number;
  url: string;
  fileSize: number;
  updatedBy: string | null;
  notes: string | null;
  createdAt: string;
}

interface Document {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  url: string;
  storageProvider: string;
  ocrStatus: string;
  ocrMetadata: string | null;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  versions: DocumentVersion[];
}

export default function DocumentsPage() {
  const { activeOrganization, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'ledger'>('telemetry');
  
  // Storage & Telemetry states
  const [documents, setDocuments] = useState<Document[]>([]);
  const [storageMetrics, setStorageMetrics] = useState<any>(null);
  const [storageLogsList, setStorageLogsList] = useState<string[]>([]);
  const [changingProvider, setChangingProvider] = useState(false);

  // Upload Form states
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('PDF');
  const [fileSizeKB, setFileSizeKB] = useState(150);
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState('');

  // Modals & Panels
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // OCR Drawer states
  const [showOcrDrawer, setShowOcrDrawer] = useState(false);
  const [runningOcr, setRunningOcr] = useState(false);
  const [ocrResults, setOcrResults] = useState<any>(null);
  const [expenseCategory, setExpenseCategory] = useState('Software');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState('Credit Card');
  const [promotingExpense, setPromotingExpense] = useState(false);
  const [promotionResult, setPromotionResult] = useState('');

  // Terminal scroll target
  const terminalRef = useRef<HTMLDivElement>(null);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/documents');
      setDocuments(res.data.documents || []);
      setStorageMetrics(res.data.storageMetrics);
      setStorageLogsList(res.data.storageLogs || []);
    } catch (err) {
      console.error('Failed to fetch documents context:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && activeOrganization) {
      fetchData();
      
      // Set up polling for telemetry metrics & rolling logs (every 3 seconds)
      const interval = setInterval(() => {
        fetchData(true);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [activeOrganization, authLoading]);

  // Auto-scroll terminal log
  useEffect(() => {
    if (activeTab === 'telemetry' && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [storageLogsList, activeTab]);

  const handleProviderChange = async (provider: 'AWS_S3' | 'CLOUDFLARE_R2' | 'MINIO') => {
    if (storageMetrics?.activeProvider === provider || changingProvider) return;
    
    setChangingProvider(true);
    try {
      await api.post('/documents/change-provider', { provider });
      await fetchData(true);
    } catch (err) {
      console.error('Failed to change storage provider:', err);
      alert('Error switching cloud storage integration.');
    } finally {
      setChangingProvider(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName) {
      alert('Please enter a document filename.');
      return;
    }

    // Append extension if missing
    let finalName = fileName;
    const extension = `.${fileType.toLowerCase()}`;
    if (!finalName.toLowerCase().endsWith(extension)) {
      finalName += extension;
    }

    setUploading(true);
    setUploadSuccessMessage('');
    try {
      await api.post('/documents', {
        name: finalName,
        fileType,
        fileSize: fileSizeKB * 1024,
        notes: uploadNotes
      });
      
      setFileName('');
      setUploadNotes('');
      setUploadSuccessMessage('Object pushed to bucket successfully.');
      await fetchData(true);
      setTimeout(() => setUploadSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to upload document:', err);
      alert('Error uploading document.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Are you sure you want to purge this document and all its versions from storage?')) return;
    
    try {
      await api.delete(`/documents/${id}`);
      // Close open drawer/modal if related
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
        setShowHistoryModal(false);
        setShowOcrDrawer(false);
      }
      await fetchData(true);
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('Delete request failed.');
    }
  };

  const handleTriggerOcr = async (doc: Document) => {
    setSelectedDoc(doc);
    setRunningOcr(true);
    setShowOcrDrawer(true);
    setOcrResults(null);
    setPromotionResult('');

    try {
      // 1. Post to start OCR simulated worker
      await api.post(`/documents/${doc.id}/ocr`);
      
      // 2. Poll for OCR status until completed (every 500ms, max 10 retries)
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await api.get('/documents');
          const latestDoc = (res.data.documents || []).find((d: any) => d.id === doc.id);
          
          if (latestDoc && latestDoc.ocrStatus === 'COMPLETED') {
            clearInterval(interval);
            setRunningOcr(false);
            setOcrResults(JSON.parse(latestDoc.ocrMetadata || '{}'));
            fetchData(true);
          } else if (latestDoc && latestDoc.ocrStatus === 'FAILED') {
            clearInterval(interval);
            setRunningOcr(false);
            alert('OCR Processing failed.');
          } else if (attempts >= 15) {
            clearInterval(interval);
            setRunningOcr(false);
            alert('OCR processing timed out.');
          }
        } catch (e) {
          clearInterval(interval);
          setRunningOcr(false);
        }
      }, 500);

    } catch (err) {
      console.error('OCR pipeline initialization failed:', err);
      setRunningOcr(false);
      alert('Failed to trigger OCR processing.');
    }
  };

  const handleSyncToLedger = async () => {
    if (!ocrResults || !selectedDoc) return;
    
    setPromotingExpense(true);
    setPromotionResult('');
    try {
      const payload = {
        description: `[OCR Sync] ${ocrResults.description} (Ref: ${ocrResults.invoiceNumber})`,
        category: expenseCategory,
        amount: Number(ocrResults.total),
        date: ocrResults.invoiceDate || new Date().toISOString().split('T')[0],
        paymentMethod: expensePaymentMethod
      };

      await api.post('/accounting/expenses', payload);
      setPromotionResult('Ledger synchronized. Double-entry entries generated!');
      setTimeout(() => {
        setPromotionResult('');
        setShowOcrDrawer(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to sync expense to accounting:', err);
      alert('Failed to register synced expense in double-entry books.');
    } finally {
      setPromotingExpense(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#FDFDFD] dark:bg-slate-950 text-gray-500 dark:text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-black dark:text-white mb-3" />
        <span className="text-xs font-semibold font-mono tracking-wider uppercase text-gray-400">Mounting Cloud Buckets...</span>
      </div>
    );
  }

  const activeProvider = storageMetrics?.activeProvider || 'AWS_S3';

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FAFAFA] dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans animate-in fade-in duration-300">
      
      {/* Page Header */}
      <header className="px-8 py-6 border-b border-[#EEEEEE] dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-black dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg">
              <FolderOpen className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Cloud Storage & Document Room</h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Store business invoices, audit previous PDF/image file versioning history, and trigger OCR data extractions.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#F5F5F5] dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-mono text-gray-500 dark:text-slate-400">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span>SCOPED: TENANT_ISOLATION</span>
        </div>
      </header>

      {/* Main Workspace Grid */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all duration-200 ${
              activeTab === 'telemetry' 
                ? 'border-black text-black dark:border-white dark:text-white' 
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 text-amber-500" />
            <span>Storage & Logs Telemetry</span>
          </button>
          
          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all duration-200 ${
              activeTab === 'ledger' 
                ? 'border-black text-black dark:border-white dark:text-white' 
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-violet-500" />
            <span>Files Library Grid ({documents.length})</span>
          </button>
        </div>

        {/* Tab 1: Telemetry Dashboard */}
        {activeTab === 'telemetry' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left & Center column (2cols) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Storage Provider Selector */}
              <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-gray-500" />
                    Configure Active Cloud Provider
                  </h3>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">S3-compatible engine</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleProviderChange('AWS_S3')}
                    className={`py-3 px-4 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
                      activeProvider === 'AWS_S3'
                        ? 'border-black bg-black text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 shadow-md'
                        : 'border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-400 dark:hover:border-slate-600 hover:text-gray-955 dark:hover:text-white'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>AWS S3</span>
                  </button>
 
                  <button
                    onClick={() => handleProviderChange('CLOUDFLARE_R2')}
                    className={`py-3 px-4 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
                      activeProvider === 'CLOUDFLARE_R2'
                        ? 'border-black bg-black text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 shadow-md'
                        : 'border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-400 dark:hover:border-slate-600 hover:text-gray-955 dark:hover:text-white'
                    }`}
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>Cloudflare R2</span>
                  </button>
 
                  <button
                    onClick={() => handleProviderChange('MINIO')}
                    className={`py-3 px-4 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
                      activeProvider === 'MINIO'
                        ? 'border-black bg-black text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 shadow-md'
                        : 'border-[#E5E5E5] dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-400 dark:hover:border-slate-600 hover:text-gray-955 dark:hover:text-white'
                    }`}
                  >
                    <Cpu className="w-4 h-4" />
                    <span>MinIO local server</span>
                  </button>
                </div>
              </div>

              {/* Gauges Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Occupied space</span>
                  <div className="mt-2">
                    <span className="text-xl font-bold font-mono text-gray-900 dark:text-white">
                      {formatBytes(storageMetrics?.storageUsedBytes || 0)}
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Total Objects</span>
                  <div className="mt-2">
                    <span className="text-xl font-bold font-mono text-gray-900 dark:text-white">{storageMetrics?.totalFiles || 0} files</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Storage Requests</span>
                  <div className="mt-2">
                    <span className="text-xl font-bold font-mono text-gray-900 dark:text-white">{storageMetrics?.apiRequestCount || 0} API Calls</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 p-4 rounded-xl shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Bandwidth Transferred</span>
                  <div className="mt-2">
                    <span className="text-xl font-bold font-mono text-gray-900 dark:text-white">
                      {formatBytes(storageMetrics?.bandwidthTransferredBytes || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bucket Internal Details Panel */}
              <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs">
                <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider mb-4">
                  Active Bucket Mount Schema
                </h3>

                {activeProvider === 'AWS_S3' && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-slate-950/20 border border-[#EAEAEA] dark:border-slate-805 p-3 rounded-lg flex flex-col gap-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-400 dark:text-slate-500">Storage Location URI:</span>
                        <strong className="text-black dark:text-white">s3://kaasvex-production-storage</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 dark:text-slate-500">AWS Region:</span>
                        <strong className="text-black dark:text-white">us-east-1</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 dark:text-slate-500">Server Side Encryption:</span>
                        <strong className="text-emerald-600 dark:text-emerald-450">AES-256 (KMS Managed)</strong>
                      </div>
                    </div>
                  </div>
                )}

                {activeProvider === 'CLOUDFLARE_R2' && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-slate-950/20 border border-[#EAEAEA] dark:border-slate-805 p-3 rounded-lg flex flex-col gap-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-400 dark:text-slate-500">CF Account Reference:</span>
                        <strong className="text-black dark:text-white">r2_acct_88204f</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 dark:text-slate-500">Bucket Identifier:</span>
                        <strong className="text-black dark:text-white">kaasvex-r2-assets</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 dark:text-slate-500">Egress Fee Exemption:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400">ACTIVE (0.00 USD/GB)</strong>
                      </div>
                    </div>
                  </div>
                )}

                {activeProvider === 'MINIO' && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-slate-950/20 border border-[#EAEAEA] dark:border-slate-800 p-3 rounded-lg flex flex-col gap-1.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-400 dark:text-slate-500">MinIO Local URI:</span>
                        <strong className="text-black dark:text-white">http://192.168.1.150:9000</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 dark:text-slate-500">MinIO Console Port:</span>
                        <strong className="text-black dark:text-white">9001</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 dark:text-slate-500">Bucket Namespace:</span>
                        <strong className="text-black dark:text-white">kaasvex-minio-bucket</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* S3 Command Daemon Logs */}
              <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-gray-600 animate-pulse" />
                    Cloud Storage Access Daemon Logs
                  </h3>
                  <button 
                    onClick={() => {
                      setStorageLogsList(['[' + new Date().toISOString() + '] Storage command output buffer cleared.']);
                    }}
                    className="text-[10px] font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                  >
                    Clear Terminal
                  </button>
                </div>
                
                <div ref={terminalRef} className="h-64 rounded-xl bg-black border border-gray-800 dark:border-slate-800 p-4 font-mono text-xs text-green-400 overflow-y-auto space-y-1.5 scrollbar-thin shadow-inner select-text">
                  {storageLogsList.length === 0 ? (
                    <div className="text-gray-500 italic text-[11px]">Standby. Listening for bucket activity hooks...</div>
                  ) : (
                    storageLogsList.map((logLine, idx) => {
                      let textClass = 'text-green-400';
                      if (logLine.includes('[ERROR]')) textClass = 'text-rose-500 font-bold';
                      if (logLine.includes('[WARNING]')) textClass = 'text-amber-400';
                      if (logLine.includes('=== Storage Provider switched')) textClass = 'text-cyan-400 font-bold';
                      return (
                        <div key={idx} className={`${textClass} leading-relaxed text-[11px]`}>
                          {logLine}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

            {/* Right column upload panel (1col) */}
            <div className="space-y-6">
              
              {/* File Upload Simulator card */}
              <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs">
                <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-gray-600 dark:text-slate-400" />
                  Simulated File Ingest Upload
                </h3>
                
                <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-500 dark:text-slate-400 font-semibold mb-1">File Name</label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="e.g. receipt_office_supplies"
                      className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-black dark:focus:border-white text-gray-800 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-500 dark:text-slate-400 font-semibold mb-1">File Extension</label>
                      <select
                        value={fileType}
                        onChange={(e) => setFileType(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-black dark:focus:border-white text-gray-800 dark:text-white"
                      >
                        <option value="PDF">PDF (.pdf)</option>
                        <option value="PNG">PNG (.png)</option>
                        <option value="JPG">JPG (.jpg)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-500 dark:text-slate-400 font-semibold mb-1">Size (KB)</label>
                      <input
                        type="number"
                        value={fileSizeKB}
                        onChange={(e) => setFileSizeKB(Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-black dark:focus:border-white text-gray-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-500 dark:text-slate-400 font-semibold mb-1">Changelog / Version Notes</label>
                    <input
                      type="text"
                      value={uploadNotes}
                      onChange={(e) => setUploadNotes(e.target.value)}
                      placeholder="e.g. Initial receipt image copy"
                      className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-black dark:focus:border-white text-gray-800 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full py-2 bg-black hover:bg-gray-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5" />
                    )}
                    <span>Upload to Cloud</span>
                  </button>

                  {uploadSuccessMessage && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-400 text-center font-mono text-[10px] font-medium rounded-lg animate-fade-in">
                      {uploadSuccessMessage}
                    </div>
                  )}
                </form>
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 text-[10px] text-gray-400 dark:text-slate-500 font-mono leading-relaxed">
                  * Note: Re-uploading a file with the exact same name automatically creates a new file version branch.
                </div>
              </div>

              {/* Quick info card */}
              <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl p-5 shadow-2xs">
                <h3 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                  OCR-to-Ledger pipeline
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                  Documents loaded into cloud buckets can be parsed in real-time by clicking the OCR Extraction button. The system scans the document, parses tax and totals, and generates ledger journal entries instantly with one click.
                </p>
              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Files Ledger Table */}
        {activeTab === 'ledger' && (
          <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="px-6 py-5 border-b border-[#EEEEEE] dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Cloud Document Repository</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Audit log of enqueued files, metadata sizes, and version numbers.</p>
              </div>
              <button
                onClick={() => fetchData(false)}
                className="p-1.5 border border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500 rounded-lg text-gray-600 dark:text-slate-400 transition-colors"
                title="Refresh folder"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              {documents.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-400 dark:text-slate-500 italic">No files registered inside S3 bucket yet.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Filename</th>
                      <th className="px-6 py-4">File Type</th>
                      <th className="px-6 py-4">File Size</th>
                      <th className="px-6 py-4">Storage Provider</th>
                      <th className="px-6 py-4">Current Version</th>
                      <th className="px-6 py-4">OCR Status</th>
                      <th className="px-6 py-4">Last Updated</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs font-mono">
                    {documents.map((doc) => {
                      let ocrBadge = 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-400';
                      if (doc.ocrStatus === 'PENDING') ocrBadge = 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400';
                      if (doc.ocrStatus === 'PROCESSING') ocrBadge = 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60';
                      if (doc.ocrStatus === 'COMPLETED') ocrBadge = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60';
                      if (doc.ocrStatus === 'FAILED') ocrBadge = 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400 border border-rose-100 dark:border-rose-900/60';

                      return (
                        <tr key={doc.id} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-800/40 transition-colors text-[11px]">
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white truncate max-w-[180px] font-sans flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
                            <span className="truncate">{doc.name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                              {doc.fileType}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-slate-300">
                            {formatBytes(doc.fileSize)}
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                            {doc.storageProvider}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => {
                                setSelectedDoc(doc);
                                setShowHistoryModal(true);
                              }}
                              className="text-[10px] bg-[#F4F4F4] dark:bg-slate-800 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-slate-900 px-2 py-0.5 rounded text-gray-700 dark:text-slate-300 transition-colors font-bold"
                            >
                              v{doc.currentVersion}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${ocrBadge}`}>
                              {doc.ocrStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-400 dark:text-slate-500">
                            {new Date(doc.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2 font-sans">
                            <button
                              onClick={() => handleTriggerOcr(doc)}
                              className="px-2.5 py-1 bg-black dark:bg-slate-100 hover:bg-gray-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded text-[10px] font-bold inline-flex items-center gap-1"
                            >
                              <Cpu className="w-3 h-3" />
                              <span>OCR Data</span>
                            </button>
                            <button
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="p-1 border border-[#E5E5E5] dark:border-slate-800 hover:border-red-400 hover:text-red-500 dark:hover:text-red-400 text-gray-400 rounded inline-flex items-center"
                              title="Delete file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Version History Modal */}
      {showHistoryModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-[#EBEBEB] dark:border-slate-800 rounded-xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-[#EEEEEE] dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white font-sans">Versioning Branches</h3>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 font-sans">Object: <span className="font-mono text-black dark:text-white font-bold">{selectedDoc.name}</span></p>
              </div>
              <button 
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedDoc(null);
                }} 
                className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              {selectedDoc.versions.map((ver) => (
                <div key={ver.id} className="border border-gray-150 dark:border-slate-800 rounded-xl p-4 flex justify-between bg-gray-50/50 dark:bg-slate-950/20 hover:bg-gray-50 dark:hover:bg-slate-950/40 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-black dark:bg-slate-800 text-white dark:text-slate-200 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                        v{ver.version}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono">
                        {new Date(ver.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-800 dark:text-slate-300 font-semibold font-sans mt-2">
                      {ver.notes || 'No changelog comments.'}
                    </p>
                    <div className="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">
                      Uploaded by: <span className="text-gray-600 dark:text-slate-300 font-bold">{ver.updatedBy || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col justify-between items-end">
                    <span className="text-[10px] font-mono text-gray-500 dark:text-slate-400 font-bold">{formatBytes(ver.fileSize)}</span>
                    <a 
                      href={ver.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] text-gray-500 dark:text-slate-400 hover:text-black dark:hover:text-white font-bold flex items-center gap-1 font-sans mt-4"
                    >
                      <span>Download file</span>
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OCR Extraction Result Drawer */}
      {showOcrDrawer && selectedDoc && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border-l border-[#EBEBEB] dark:border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl p-6 overflow-y-auto space-y-6">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-violet-500 animate-pulse" />
                  OCR Intelligence Scanner
                </h3>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-0.5 block truncate max-w-[280px]">File: {selectedDoc.name}</span>
              </div>
              <button 
                onClick={() => {
                  setShowOcrDrawer(false);
                  setOcrResults(null);
                }}
                className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* OCR Processing State */}
            {runningOcr ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-black dark:text-white mb-3" />
                <span className="text-[10px] font-bold font-mono uppercase tracking-wider">Analyzing receipt structures...</span>
              </div>
            ) : ocrResults ? (
              <div className="space-y-6 text-xs">
                
                {/* OCR Metadata fields */}
                <div className="border border-[#E5E5E5] dark:border-slate-800 rounded-xl p-4 bg-[#FAFAFA] dark:bg-slate-950/20 space-y-2.5 font-mono text-[11px]">
                  <div className="flex justify-between border-b dark:border-slate-800 pb-1.5">
                    <span className="text-gray-400 dark:text-slate-500">Vendor:</span>
                    <strong className="text-gray-900 dark:text-white">{ocrResults.vendorName}</strong>
                  </div>
                  <div className="flex justify-between border-b dark:border-slate-800 pb-1.5">
                    <span className="text-gray-400 dark:text-slate-500">Invoice Number:</span>
                    <strong className="text-gray-900 dark:text-white">{ocrResults.invoiceNumber}</strong>
                  </div>
                  <div className="flex justify-between border-b dark:border-slate-800 pb-1.5">
                    <span className="text-gray-400 dark:text-slate-500">Invoice Date:</span>
                    <strong className="text-gray-900 dark:text-white">{ocrResults.invoiceDate}</strong>
                  </div>
                  <div className="flex justify-between border-b dark:border-slate-800 pb-1.5">
                    <span className="text-gray-400 dark:text-slate-500">Subtotal:</span>
                    <strong className="text-gray-900 dark:text-white">₹{ocrResults.subtotal?.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between border-b dark:border-slate-805 pb-1.5">
                    <span className="text-gray-400 dark:text-slate-500">GST/VAT (18%):</span>
                    <strong className="text-gray-900 dark:text-white">₹{ocrResults.taxAmount?.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between pt-0.5 text-xs">
                    <span className="text-gray-500 dark:text-slate-400 font-bold">Total Scanned:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">₹{ocrResults.total?.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {/* Ledger Sync Forms */}
                <div className="space-y-4 pt-4 border-t border-gray-150 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
                    Synchronize to Ledger
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-500 dark:text-slate-400 font-semibold mb-1">Expense Category</label>
                      <select
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-black dark:focus:border-white text-gray-850 dark:text-white"
                      >
                        <option value="Software">Software (API/SaaS)</option>
                        <option value="Utilities">Utilities (Telecom/Servers)</option>
                        <option value="Travel">Travel (Transport/Taxi)</option>
                        <option value="Meals">Meals & Client meetings</option>
                        <option value="Rent">Rent (Workspace)</option>
                        <option value="Other">Other Expenses</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-500 dark:text-slate-400 font-semibold mb-1">Payment Method</label>
                      <select
                        value={expensePaymentMethod}
                        onChange={(e) => setExpensePaymentMethod(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-[#E5E5E5] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-black dark:focus:border-white text-gray-850 dark:text-white"
                      >
                        <option value="Credit Card">Credit Card</option>
                        <option value="Cash">Cash Ledger</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleSyncToLedger}
                    disabled={promotingExpense}
                    className="w-full py-2.5 bg-violet-600 dark:bg-violet-700 hover:bg-violet-700 dark:hover:bg-violet-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {promotingExpense ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Sync Scanned Receipt to Expenses</span>
                  </button>

                  {promotionResult && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-mono text-[10px] font-semibold rounded-lg animate-fade-in">
                      {promotionResult}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-gray-400 dark:text-slate-500 italic text-center py-12 text-xs">Error parsing receipt OCR details.</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
