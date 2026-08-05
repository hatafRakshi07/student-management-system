import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  UploadCloud, CheckCircle2, RefreshCw, FileSpreadsheet, Users,
  DollarSign, AlertTriangle, Clock, Filter, ShieldCheck, FileText, Check
} from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const ImportModule = () => {
  const [activeTab, setActiveTab] = useState('report');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [unmatchedRecords, setUnmatchedRecords] = useState([]);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const token = localStorage.getItem('token');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    fetchLatestData();
  }, []);

  const fetchLatestData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Latest Report
      const repRes = await axios.get(`${API_BASE}/import/latest-report`, authHeaders);
      if (repRes.data && repRes.data.id) {
        setReport(repRes.data);
      }

      // Fetch Dashboard Metrics
      const metRes = await axios.get(`${API_BASE}/import/dashboard-metrics`, authHeaders);
      setMetrics(metRes.data);

      // Fetch Unmatched Fee Records
      const unmRes = await axios.get(`${API_BASE}/import/unmatched-fees`, authHeaders);
      setUnmatchedRecords(unmRes.data.records || []);
    } catch (err) {
      console.error('Error fetching import module data:', err);
      setError('Could not load import metrics. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunImport = async () => {
    setImporting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await axios.post(`${API_BASE}/import/run`, {}, authHeaders);
      if (res.data && res.data.report) {
        setReport(res.data.report);
        setSuccessMsg('Import executed successfully! Student Master and Fee Details imported cleanly.');
        fetchLatestData();
      }
    } catch (err) {
      console.error('Import execution error:', err);
      setError(err.response?.data?.detail || 'Import failed. Please check backend logs.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif', color: '#1e293b' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
        borderRadius: '16px',
        padding: '28px 32px',
        color: '#ffffff',
        boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.3)',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <FileSpreadsheet size={28} color="#a5b4fc" />
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>
              Student & Fee Data Import Module
            </h1>
          </div>
          <p style={{ margin: 0, color: '#c7d2fe', fontSize: '14px' }}>
            Automated multi-file import processing for <b>AKLANK COLLEGE (1).xlsx</b> & <b>aklank college fees 2023-24.csv</b>
          </p>
        </div>

        <button
          onClick={handleRunImport}
          disabled={importing}
          style={{
            background: importing ? '#6366f1' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: importing ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          <RefreshCw size={18} className={importing ? 'spin' : ''} />
          {importing ? 'Processing Import...' : 'Run Full Import'}
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={20} color="#059669" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Highlights */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
              <span>Total Students</span>
              <Users size={18} color="#6366f1" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', marginTop: '6px' }}>
              {metrics.total_students}
            </div>
            <div style={{ fontSize: '12px', color: '#10b981', marginTop: '4px' }}>
              New: {metrics.new_students} | Old: {metrics.old_students}
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
              <span>Total Fees Collected</span>
              <DollarSign size={18} color="#10b981" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', marginTop: '6px' }}>
              ₹{metrics.total_fees_collected.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Pending: ₹{metrics.pending_fees.toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
              <span>Discounts & Refunds</span>
              <Filter size={18} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', marginTop: '6px' }}>
              ₹{metrics.discount_amount.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
              Refunds: ₹{metrics.refund_amount.toLocaleString('en-IN')}
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
              <span>Unmatched Receipts</span>
              <AlertTriangle size={18} color="#ef4444" />
            </div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', marginTop: '6px' }}>
              {unmatchedRecords.length}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Cancelled Receipts: {metrics.cancelled_receipts}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '24px' }}>
        {[
          { id: 'report', label: 'Import Executive Report', icon: FileText },
          { id: 'financials', label: 'Collection & Financials', icon: DollarSign },
          { id: 'unmatched', label: `Unmatched Fee Records (${unmatchedRecords.length})`, icon: AlertTriangle },
          { id: 'students', label: 'Student Fee Summaries', icon: Users }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '3px solid #4338ca' : '3px solid transparent',
                padding: '12px 4px',
                fontSize: '15px',
                fontWeight: isActive ? '600' : '500',
                color: isActive ? '#4338ca' : '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Executive Report */}
      {activeTab === 'report' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck color="#4338ca" /> Latest Execution Summary Report
          </h3>

          {report ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Student Master Excel</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '4px 0' }}>
                    {report.student_records_found} Records Found
                  </div>
                  <div style={{ fontSize: '13px', color: '#059669' }}>
                    ✓ {report.students_imported} New | ↺ {report.students_updated} Updated
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>User Login Creation</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '4px 0' }}>
                    {report.users_created} Users Created
                  </div>
                  <div style={{ fontSize: '13px', color: '#6366f1' }}>
                    ⚡ {report.duplicate_usernames_fixed} Duplicate Usernames Resolved
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Fee CSV Transactions</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '4px 0' }}>
                    {report.fee_records_found} Receipts Processed
                  </div>
                  <div style={{ fontSize: '13px', color: '#059669' }}>
                    ✓ {report.fee_transactions_imported} Inserted | ↺ {report.duplicate_receipts_updated || report.fee_transactions_updated} Updated
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Unmatched & Errors</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#ef4444', margin: '4px 0' }}>
                    {report.unmatched_fee_records} Unmatched Receipts
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    Failed Records: {report.failed_records}
                  </div>
                </div>
              </div>

              {/* Execution Timestamps */}
              <div style={{ background: '#f1f5f9', padding: '14px 18px', borderRadius: '8px', fontSize: '13px', color: '#475569', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} /> <b>Started:</b> {new Date(report.start_time).toLocaleString()}
                </div>
                {report.end_time && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={16} color="#059669" /> <b>Completed:</b> {new Date(report.end_time).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>No import has been executed yet. Click <b>Run Full Import</b> above to begin.</p>
          )}
        </div>
      )}

      {/* Tab 2: Collection & Financials */}
      {activeTab === 'financials' && metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#475569' }}>Fee Collection Timeline</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span>Today's Collection</span>
                <b>₹{metrics.today_collection.toLocaleString('en-IN')}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span>Monthly Collection</span>
                <b>₹{metrics.monthly_collection.toLocaleString('en-IN')}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                <span>Yearly Collection</span>
                <b>₹{metrics.yearly_collection.toLocaleString('en-IN')}</b>
              </div>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#475569' }}>Fee Breakdown & Adjustments</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span>Total Fees Paid</span>
                <b style={{ color: '#059669' }}>₹{metrics.paid_fees.toLocaleString('en-IN')}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span>Total Discounts Given</span>
                <b style={{ color: '#d97706' }}>₹{metrics.discount_amount.toLocaleString('en-IN')}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                <span>Cancelled Receipts Amount</span>
                <b style={{ color: '#dc2626' }}>₹{metrics.cancelled_amount.toLocaleString('en-IN')} ({metrics.cancelled_receipts} Receipts)</b>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Unmatched Fee Records */}
      {activeTab === 'unmatched' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Unmatched Fee Receipts Queue</h3>
          {unmatchedRecords.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '12px' }}>Receipt #</th>
                    <th style={{ padding: '12px' }}>Reg / Scholar #</th>
                    <th style={{ padding: '12px' }}>Student Name</th>
                    <th style={{ padding: '12px' }}>Class</th>
                    <th style={{ padding: '12px' }}>Paid Amount</th>
                    <th style={{ padding: '12px' }}>Pay Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {unmatchedRecords.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#4338ca' }}>#{r.receipt_number}</td>
                      <td style={{ padding: '12px' }}>{r.reg_no || '-'}</td>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{r.student_name}</td>
                      <td style={{ padding: '12px' }}>{r.class_name}</td>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#059669' }}>₹{r.paid_amount?.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px' }}>{r.payment_mode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} /> All fee receipts matched 100% with student master records!
            </p>
          )}
        </div>
      )}

      {/* Tab 4: Student-wise Fee Summaries */}
      {activeTab === 'students' && metrics && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Student Fee Collection Summaries</h3>
          {metrics.student_fee_summary && metrics.student_fee_summary.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '12px' }}>Registration / Scholar No</th>
                    <th style={{ padding: '12px' }}>Student Name</th>
                    <th style={{ padding: '12px' }}>Class</th>
                    <th style={{ padding: '12px' }}>Total Fees Paid</th>
                    <th style={{ padding: '12px' }}>Discounts Allowed</th>
                    <th style={{ padding: '12px' }}>Receipt Count</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.student_fee_summary.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#4338ca' }}>{s.reg_no || '-'}</td>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{s.student_name}</td>
                      <td style={{ padding: '12px' }}>{s.class_name}</td>
                      <td style={{ padding: '12px', fontWeight: '600', color: '#059669' }}>₹{s.total_paid.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px', color: '#d97706' }}>₹{s.total_discount.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px' }}>{s.transaction_count} Receipt(s)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>No student fee transactions available.</p>
          )}
        </div>
      )}

    </div>
  );
};

export default ImportModule;
