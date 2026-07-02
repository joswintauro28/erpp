"use client";

import React, { useState, useEffect } from 'react';
import { api } from '@/hooks/useApi';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Sparkles, 
  Search, 
  ChevronDown, 
  SlidersHorizontal, 
  Download, 
  Plus, 
  User, 
  Mail, 
  Phone, 
  Tag, 
  X,
  UserCheck,
  Edit3
} from 'lucide-react';

const FALLBACK_LEADS = [
  { id: 'lead-1', companyName: 'Tech Solutions Ltd', contactPerson: 'John Smith', email: 'john@techsolutions.com', phone: '+1 (555) 321-4321', status: 'Qualified', leadScore: 85, assignedTo: 'Sarah Johnson', source: 'Website' },
  { id: 'lead-2', companyName: 'Global Industries', contactPerson: 'Emily Davis', email: 'emily@global.com', phone: '+1 (555) 789-9870', status: 'New Lead', leadScore: 45, assignedTo: 'Mike Chen', source: 'Referral' },
  { id: 'lead-3', companyName: 'StartUp Inc', contactPerson: 'Michael Brown', email: 'm.brown@startup.com', phone: '+1 (555) 456-6540', status: 'Proposal Sent', leadScore: 92, assignedTo: 'Sarah Johnson', source: 'LinkedIn' },
  { id: 'lead-4', companyName: 'Enterprise Co', contactPerson: 'Lisa Anderson', email: 'lisa@enterprise.com', phone: '+1 (555) 987-0123', status: 'Negotiation', leadScore: 76, assignedTo: 'David Lee', source: 'Cold Call' },
  { id: 'lead-5', companyName: 'Digital Agency', contactPerson: 'Robert Wilson', email: 'robert@digital.com', phone: '+1 (555) 345-6789', status: 'Qualified', leadScore: 67, assignedTo: 'Mike Chen', source: 'Website' },
];

export default function LeadsPage() {
  const { activeOrganization, loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);

  // Add Lead Form States
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('New Lead');
  const [leadScore, setLeadScore] = useState(50);
  const [assignedTo, setAssignedTo] = useState('Sarah Johnson');
  const [source, setSource] = useState('Website');
  const [submitting, setSubmitting] = useState(false);

  const handleOpenEdit = (lead: any) => {
    setEditingLead(lead);
    setCompanyName(lead.companyName || '');
    setContactPerson(lead.contactPerson || '');
    setEmail(lead.email || '');
    setPhone(lead.phone || '');
    setStatus(lead.status || 'New Lead');
    setLeadScore(lead.leadScore ?? 50);
    setAssignedTo(lead.assignedTo || 'Sarah Johnson');
    setSource(lead.source || 'Website');
    setShowAddModal(true);
  };

  const handleOpenAdd = () => {
    setEditingLead(null);
    setCompanyName('');
    setContactPerson('');
    setEmail('');
    setPhone('');
    setStatus('New Lead');
    setLeadScore(50);
    setAssignedTo('Sarah Johnson');
    setSource('Website');
    setShowAddModal(true);
  };

  const fetchLeads = () => {
    setLoading(true);
    api.get('/leads')
      .then(res => {
        if (!res.data.leads || res.data.leads.length === 0) {
          setLeads(FALLBACK_LEADS);
        } else {
          setLeads(res.data.leads);
        }
      })
      .catch(() => {
        // Fallback for isolated development
        setLeads(FALLBACK_LEADS);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading && activeOrganization) {
      fetchLeads();
    }
  }, [activeOrganization, authLoading]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contactPerson || !email) return;

    setSubmitting(true);
    try {
      const payload = {
        companyName,
        contactPerson,
        email,
        phone,
        status,
        leadScore: Number(leadScore),
        assignedTo,
        source
      };

      if (editingLead) {
        await api.put(`/leads/${editingLead.id}`, payload);
        alert('Lead updated successfully!');
      } else {
        await api.post('/leads', payload);
        alert('Lead created successfully!');
      }

      // Reset form states
      setCompanyName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setStatus('New Lead');
      setLeadScore(50);
      setAssignedTo('Sarah Johnson');
      setSource('Website');
      setEditingLead(null);
      setShowAddModal(false);

      // Reload leads
      fetchLeads();
    } catch (err: any) {
      console.error('Failed to save Lead:', err);
      const errMsg = err.response?.data?.error || err.message || 'Make sure the backend server is running.';
      alert(`Error saving lead: ${errMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter pipeline
  const filteredLeads = leads.filter(l => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      l.companyName?.toLowerCase().includes(query) ||
      l.contactPerson?.toLowerCase().includes(query) ||
      l.email?.toLowerCase().includes(query) ||
      l.assignedTo?.toLowerCase().includes(query)
    );

    const matchesStatus = statusFilter === 'All Statuses' || l.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      
      {/* ================= HEADER SECTOR ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white font-sans">Leads</h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Manage and track your sales leads</p>
        </div>

        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-105 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Lead</span>
        </button>
      </div>

      {/* ================= CRM PIPELINE FILTERS ================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 border border-[#EEEEEE] dark:border-slate-800 rounded-xl">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-550 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search leads..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F5F5F5] dark:bg-slate-800 text-xs pl-10 pr-4 py-2 border border-transparent rounded-lg focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 text-gray-700 dark:text-gray-250 transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>

        {/* Status Dropdowns and Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white dark:bg-slate-900 border border-[#E5E5E5] dark:border-slate-800 px-3 py-2 pr-8 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 focus:outline-none hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <option value="All Statuses">All Statuses</option>
              <option value="New Lead">New Lead</option>
              <option value="Qualified">Qualified</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E5E5] dark:border-slate-800 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            <span>More Filters</span>
          </button>
          
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E5E5] dark:border-slate-800 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <Download className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ================= LEADS PIPELINE GRID TABLE ================= */}
      <div className="bg-white dark:bg-slate-900 border border-[#EEEEEE] dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 w-full flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-gray-100 dark:border-slate-800 border-t-black dark:border-t-white rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest animate-pulse">Hydrating Sales Leads...</span>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">
            No pipeline leads mapped in this workspace.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#EEEEEE] dark:border-slate-800 text-gray-400 dark:text-gray-500 font-bold bg-[#FAFABA]/20 dark:bg-slate-800/40 tracking-wider text-[10px] uppercase">
                  <th className="p-4 font-semibold">Company Name</th>
                  <th className="p-4 font-semibold">Contact Person</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold" style={{ width: '150px' }}>Lead Score</th>
                  <th className="p-4 font-semibold">Assigned To</th>
                  <th className="p-4 font-semibold">Source</th>
                  <th className="p-4 font-semibold text-right" style={{ width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9F9F9] dark:divide-slate-800 text-gray-705 dark:text-gray-300 font-medium">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#FCFCFC] dark:hover:bg-slate-800/30 transition-colors">
                    {/* Company */}
                    <td className="p-4 font-bold text-gray-900 dark:text-white">{lead.companyName}</td>
                    
                    {/* Contact Person */}
                    <td className="p-4 text-gray-650 dark:text-gray-300 font-semibold">{lead.contactPerson}</td>
                    
                    {/* Email */}
                    <td className="p-4 text-gray-500 dark:text-gray-400 font-normal">{lead.email}</td>
                    
                    {/* Status pill mapping exact styles of the screenshots */}
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                        lead.status === 'Qualified' ? 'bg-[#EFEFEF] dark:bg-slate-800 text-black dark:text-white border-[#E0E0E0] dark:border-slate-700 font-extrabold shadow-sm' :
                        lead.status === 'New Lead' ? 'bg-[#F2F2F2] dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 border-transparent' :
                        lead.status === 'Proposal Sent' ? 'bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-300 border-[#EEEEEE] dark:border-slate-850' :
                        'bg-black dark:bg-white text-white dark:text-black border-transparent'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    
                    {/* Lead Score progress bars */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-105 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              lead.leadScore >= 80 ? 'bg-black dark:bg-white' :
                              lead.leadScore >= 60 ? 'bg-gray-800 dark:bg-slate-300' :
                              'bg-gray-400 dark:bg-slate-500'
                            }`}
                            style={{ width: `${lead.leadScore}%` }} 
                          />
                        </div>
                        <span className="font-mono text-[10px] font-bold text-gray-500 dark:text-gray-400">{lead.leadScore}</span>
                      </div>
                    </td>

                    {/* Assigned To */}
                    <td className="p-4 text-gray-500 dark:text-gray-400 font-normal">{lead.assignedTo || '—'}</td>

                    {/* Source */}
                    <td className="p-4 text-gray-400 dark:text-gray-550 font-normal">{lead.source || 'Website'}</td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(lead)}
                        className="p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-md hover:bg-gray-50 dark:hover:bg-slate-800"
                        title="Edit Lead"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= ADD LEAD ACTION MODAL ================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md border border-[#EEEEEE] dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200 mx-4">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-gray-500 dark:text-gray-450" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{editingLead ? 'Edit CRM Lead' : 'Add CRM Lead'}</h3>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingLead(null);
                }}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg p-1 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddLead} className="p-6 space-y-4">
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Company / Organization *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Tech Solutions Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-250 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-550"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Contact Person */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Contact Person *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="John Smith"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-250 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Email *</label>
                  <input 
                    type="email" 
                    required
                    placeholder="john@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-250 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Phone</label>
                  <input 
                    type="text" 
                    placeholder="+1 (555) 321-4321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-250 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-700 transition-all"
                  />
                </div>

                {/* Pipeline Status */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">Funnel Stage</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all cursor-pointer"
                  >
                    <option value="New Lead">New Lead</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Negotiation">Negotiation</option>
                  </select>
                </div>

                {/* Lead Score Slider */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Predictive Lead Score</label>
                    <span className="text-[10px] font-bold bg-black dark:bg-white text-white dark:text-black px-1.5 py-0.5 rounded font-mono">{leadScore}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100"
                    value={leadScore}
                    onChange={(e) => setLeadScore(Number(e.target.value))}
                    className="w-full h-1 bg-gray-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white focus:outline-none"
                  />
                </div>

                {/* Assigned Representative */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-505 uppercase tracking-wide mb-1">Assigned Agent</label>
                  <select 
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all cursor-pointer"
                  >
                    <option value="Sarah Johnson">Sarah Johnson</option>
                    <option value="Mike Chen">Mike Chen</option>
                    <option value="David Lee">David Lee</option>
                  </select>
                </div>

                {/* Lead Source */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-505 uppercase tracking-wide mb-1">Lead Source</label>
                  <select 
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full bg-[#F5F5F5] dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-gray-200 dark:focus:border-slate-705 transition-all cursor-pointer"
                  >
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Cold Call">Cold Call</option>
                  </select>
                </div>

              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingLead(null);
                  }}
                  className="px-4 py-2 border border-[#E5E5E5] dark:border-slate-800 rounded-lg text-xs font-semibold text-gray-605 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 shadow-sm text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-300 dark:disabled:bg-slate-800 disabled:scale-100 flex items-center gap-1.5"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />}
                  <span>Save Lead</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}