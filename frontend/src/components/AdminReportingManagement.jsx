import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileText, Download, Calendar, Clock, RefreshCw,
  Plus, CheckCircle, FileSpreadsheet, Send, ShieldCheck,
  X, Check, AlertOctagon
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export const AdminReportingManagement = () => {
  const { token, API_BASE_URL } = useAuth();
  const [reportType, setReportType] = useState('freshness'); // freshness, compliance, waste
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [scheduledReports, setScheduledReports] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  // New Schedule Form
  const [scheduleForm, setScheduleForm] = useState({
    name: 'Weekly Freshness & Shelf-Life Audit',
    report_type: 'freshness',
    frequency: 'Weekly (Mondays)',
    format: 'PDF',
    recipients: 'admin@freshguard.io'
  });

  const fetchReport = useCallback(async (type) => {
    setLoading(true);
    setReportData(null);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setReportData(await res.json());
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  const fetchScheduled = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reports/scheduled`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setScheduledReports(await res.json());
    } catch (err) {
      console.error('Failed to load scheduled reports:', err);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchReport(reportType);
    fetchScheduled();
  }, [fetchReport, fetchScheduled, reportType]);

  // Generate & Export Excel (CSV)
  const handleExportExcel = async (type) => {
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/export/excel?report_type=${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_freshguard_report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setSuccessNotice(`Exported Excel/CSV report successfully.`);
        setTimeout(() => setSuccessNotice(''), 3500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  // Generate & Export PDF
  const handleExportPDF = () => {
    if (!reportData) return;
    setExporting(true);
    try {
      const doc = new jsPDF();
      doc.setFillColor(0, 71, 171); // #0047AB
      doc.rect(0, 0, 210, 26, 'F');

      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text("FreshGuard • Freshness & Shelf-Life Audit Report", 14, 16);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

      let yPos = 36;
      doc.setFontSize(11);
      doc.setTextColor(20, 20, 20);
      doc.setFont('helvetica', 'bold');
      doc.text(`Report Type: ${reportType.toUpperCase()}`, 14, yPos);
      yPos += 7;

      if (reportType === 'freshness') {
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Tracked Batches: ${reportData.total_items || 0}`, 14, yPos);
        doc.text(`Store Freshness Average: ${reportData.average_freshness_score || 0}%`, 100, yPos);
        yPos += 10;

        doc.setFont('helvetica', 'bold');
        doc.text("Top Batch Items & Projected Shelf-Life:", 14, yPos);
        yPos += 6;

        (reportData.items || []).slice(0, 18).forEach((item) => {
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.text(`• ${item.name} (${item.batch_number}) | Qty: ${item.quantity} | Health: ${Math.round(item.overall_food_health_score || 0)}% | Days Left: ${item.days_remaining}d`, 14, yPos);
          yPos += 5.5;
        });
      } else if (reportType === 'waste') {
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Expired Batches: ${reportData.expired_count || 0}`, 14, yPos);
        doc.text(`Expired Loss Value: ₹${reportData.expired_loss_value_inr || 0}`, 100, yPos);
        yPos += 10;

        doc.setFont('helvetica', 'bold');
        doc.text("Expired Inventory Batches:", 14, yPos);
        yPos += 6;

        (reportData.expired_items || []).slice(0, 16).forEach((item) => {
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.text(`• ${item.name} (${item.batch_number}) | Qty: ${item.quantity} ${item.unit} | Loss: ₹${item.loss_value_inr} | ${item.recommended_action}`, 14, yPos);
          yPos += 5.5;
        });
      } else {
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Cold Zones: ${reportData.total_zones || 0}`, 14, yPos);
        doc.text(`Compliance Rate: ${reportData.overall_compliance_rate_pct || 0}%`, 100, yPos);
        yPos += 10;

        (reportData.zones || []).forEach((zone) => {
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.text(`• ${zone.zone_name}: ${zone.temperature_c}°C, ${zone.humidity_pct}% RH | Status: ${zone.compliance_status}`, 14, yPos);
          yPos += 5.5;
        });
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text("FreshGuard AI Food Freshness Monitoring Platform • Official Regulatory Audit", 14, 288);

      doc.save(`freshguard_${reportType}_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      setSuccessNotice(`Exported PDF report successfully.`);
      setTimeout(() => setSuccessNotice(''), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/reports/scheduled`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(scheduleForm)
      });
      if (res.ok) {
        setShowScheduleModal(false);
        fetchScheduled();
        setSuccessNotice('Report schedule saved.');
        setTimeout(() => setSuccessNotice(''), 3500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#0047AB]" />
          <span>Reporting Management</span>
        </h2>
        {successNotice && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-in fade-in">
            {successNotice}
          </span>
        )}
      </div>

      {/* 1. Generate Freshness & Shelf-Life Reports & Export (PDF / Excel) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Generate Freshness & Shelf-Life Reports</h3>
            <p className="text-xs text-slate-500">Produce instantaneous audit datasets across inventory, shelf life, and storage compliance.</p>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={loading || exporting || !reportData}
              className="px-3 py-1.5 bg-[#0047AB] hover:bg-[#003882] text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={() => handleExportExcel(reportType)}
              disabled={loading || exporting}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel (CSV)</span>
            </button>
          </div>
        </div>

        {/* Report Selector Pills */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <button
            onClick={() => setReportType('freshness')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              reportType === 'freshness'
                ? 'bg-blue-50 text-[#0047AB] border border-blue-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Freshness & Shelf-Life
          </button>
          <button
            onClick={() => setReportType('waste')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              reportType === 'waste'
                ? 'bg-blue-50 text-[#0047AB] border border-blue-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Waste & Expired Inventory
          </button>
          <button
            onClick={() => setReportType('compliance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
              reportType === 'compliance'
                ? 'bg-blue-50 text-[#0047AB] border border-blue-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Storage Zone Compliance
          </button>
        </div>

        {/* Quick Report Summary Strip */}
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">
            <RefreshCw className="w-5 h-5 text-[#0047AB] animate-spin mx-auto mb-2" />
            Loading report dataset…
          </div>
        ) : reportData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Report Title</span>
              <span className="text-xs font-black text-slate-900 mt-0.5 block truncate">
                {reportData.report_title}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Items / Zones</span>
              <span className="text-base font-black text-slate-900 mt-0.5 block">
                {reportData.total_items ?? reportData.total_batches_monitored ?? reportData.total_zones ?? 0}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Primary Score</span>
              <span className="text-base font-black text-emerald-600 mt-0.5 block">
                {reportData.average_freshness_score != null ? `${reportData.average_freshness_score}%` : reportData.overall_compliance_rate_pct != null ? `${reportData.overall_compliance_rate_pct}%` : `${reportData.diversion_rate_pct}%`}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Timestamp</span>
              <span className="text-xs font-mono font-bold text-slate-700 mt-1 block">
                {new Date(reportData.generated_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* 2. Scheduled Reports Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-3.5 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-700" />
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Scheduled Automated Reports
            </span>
          </div>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Schedule</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase">
                <th className="py-2.5 px-3.5">Schedule ID</th>
                <th className="py-2.5 px-3">Report Name</th>
                <th className="py-2.5 px-3">Frequency</th>
                <th className="py-2.5 px-3">Format</th>
                <th className="py-2.5 px-3">Recipients</th>
                <th className="py-2.5 px-3">Next Run</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {scheduledReports.map((sch) => (
                <tr key={sch.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500">{sch.id}</td>
                  <td className="py-2.5 px-3 font-black text-slate-900">{sch.name}</td>
                  <td className="py-2.5 px-3">{sch.frequency}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{sch.format}</td>
                  <td className="py-2.5 px-3 text-slate-500 truncate max-w-[200px]">{sch.recipients}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{sch.next_run}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {sch.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-black text-white">Schedule Automated Report</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-4 space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Schedule Name</label>
                <input
                  type="text"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Report Content</label>
                  <select
                    value={scheduleForm.report_type}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, report_type: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="freshness">Freshness & Shelf-Life</option>
                    <option value="waste">Waste & Spoilage</option>
                    <option value="compliance">Cold Storage Compliance</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Format</label>
                  <select
                    value={scheduleForm.format}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, format: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="PDF">PDF Audit Report</option>
                    <option value="Excel">Excel (CSV)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Frequency</label>
                <select
                  value={scheduleForm.frequency}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-bold"
                >
                  <option value="Daily at 06:00 AM">Daily at 06:00 AM</option>
                  <option value="Weekly (Mondays)">Weekly (Mondays)</option>
                  <option value="Bi-Weekly">Bi-Weekly</option>
                  <option value="Monthly (1st of month)">Monthly (1st of month)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Email Recipients</label>
                <input
                  type="text"
                  value={scheduleForm.recipients}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, recipients: e.target.value })}
                  placeholder="comma separated emails"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-semibold"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#0047AB] text-white rounded-lg font-bold"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
