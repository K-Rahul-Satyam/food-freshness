import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Table, BarChart2, ShieldCheck, 
  Trash2, AlertTriangle, RefreshCw, CheckCircle2, FileSpreadsheet
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export const ReportsAndExportCenter = ({ token, API_BASE_URL }) => {
  const [activeReportTab, setActiveReportTab] = useState('freshness'); // freshness, compliance, waste
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  const fetchReport = async (type) => {
    setLoading(true);
    setReportData(null);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (err) {
      console.error("Failed to load report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReport(activeReportTab);
    }
  }, [activeReportTab, token]);

  // Download Excel / CSV file from backend
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
        a.download = `${type}_inventory_report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setSuccessNotice(`Downloaded ${type.toUpperCase()} spreadsheet.`);
        setTimeout(() => setSuccessNotice(''), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  // Generate Professional PDF Report using jsPDF
  const handleExportPDF = () => {
    if (!reportData) return;
    setExporting(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header Banner
      doc.setFillColor(0, 71, 171); // Brand Blue #0047AB
      doc.rect(0, 0, 210, 28, 'F');
      
      doc.setFillColor(255, 199, 0); // Gold Accent #FFC700
      doc.rect(0, 28, 210, 3, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text("FOOD FRESHNESS AUDIT & COMPLIANCE REPORT", 14, 16);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()} | Official Quality Certification`, 14, 23);

      let yPos = 40;

      // Report Specific Rendering
      if (activeReportTab === 'freshness') {
        doc.setTextColor(20, 20, 20);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("1. Executive Freshness Summary", 14, yPos);

        yPos += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Batches Monitored: ${reportData.total_items}`, 14, yPos);
        doc.text(`Average Freshness Score: ${reportData.average_freshness_score}%`, 90, yPos);
        
        yPos += 6;
        doc.text(`Grade A: ${reportData.grade_distribution?.["Grade A"] || 0} | Grade B: ${reportData.grade_distribution?.["Grade B"] || 0} | Grade C: ${reportData.grade_distribution?.["Grade C"] || 0}`, 14, yPos);
        
        yPos += 12;
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text("2. Inventory Freshness Roster", 14, yPos);
        
        yPos += 8;
        // Table Header
        doc.setFillColor(240, 243, 248);
        doc.rect(14, yPos - 5, 182, 8, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text("ITEM NAME", 16, yPos);
        doc.text("BATCH", 65, yPos);
        doc.text("LOCATION", 95, yPos);
        doc.text("SCORE", 135, yPos);
        doc.text("GRADE", 155, yPos);
        doc.text("STATUS", 175, yPos);

        yPos += 6;
        doc.setFont('helvetica', 'normal');
        (reportData.items || []).slice(0, 25).forEach((item, idx) => {
          if (yPos > 275) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(String(item.name || "").slice(0, 24), 16, yPos);
          doc.text(String(item.batch_number || "").slice(0, 14), 65, yPos);
          doc.text(String(item.storage_location || "").slice(0, 18), 95, yPos);
          doc.text(`${item.freshness_score}%`, 135, yPos);
          doc.text(String(item.quality_grade || ""), 155, yPos);
          doc.text(String(item.status || ""), 175, yPos);
          yPos += 6;
        });

      } else if (activeReportTab === 'compliance') {
        doc.setTextColor(20, 20, 20);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("1. Cold-Chain Environmental Compliance", 14, yPos);

        yPos += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Storage Zones: ${reportData.total_zones}`, 14, yPos);
        doc.text(`Overall Compliance Rate: ${reportData.overall_compliance_rate_pct}%`, 90, yPos);

        yPos += 12;
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text("2. Storage Room Statuses", 14, yPos);

        yPos += 8;
        doc.setFillColor(240, 243, 248);
        doc.rect(14, yPos - 5, 182, 8, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text("ZONE NAME", 16, yPos);
        doc.text("TEMP (°C)", 75, yPos);
        doc.text("HUMIDITY (%)", 105, yPos);
        doc.text("COMPLIANCE", 140, yPos);
        doc.text("POWER", 175, yPos);

        yPos += 6;
        doc.setFont('helvetica', 'normal');
        (reportData.zones || []).forEach((z) => {
          doc.text(String(z.zone_name || ""), 16, yPos);
          doc.text(`${z.temperature_c}°C`, 75, yPos);
          doc.text(`${z.humidity_pct}%`, 105, yPos);
          doc.text(String(z.compliance_status || ""), 140, yPos);
          doc.text(String(z.power_status || ""), 175, yPos);
          yPos += 6;
        });

      } else {
        doc.setTextColor(20, 20, 20);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("1. Waste Reduction & Loss Prevention", 14, yPos);

        yPos += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Estimated Expired Loss: ₹${reportData.expired_loss_value_usd}`, 14, yPos);
        doc.text(`Recoverable Value (Discount/Rescue): ₹${reportData.at_risk_recoverable_usd}`, 95, yPos);
        
        yPos += 6;
        doc.text(`Waste Diversion Rate: ${reportData.diversion_rate_pct}%`, 14, yPos);

        yPos += 12;
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text("2. Immediate Rescue Candidates", 14, yPos);

        yPos += 8;
        (reportData.rescue_candidates || []).forEach(c => {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`• ${c.name} (Batch ${c.batch}) - ${c.quantity} units, ${c.days_left} days left`, 16, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          doc.text(`  Action: ${c.suggested_action} (Est. Recovery: ₹${c.estimated_recovery})`, 16, yPos);
          yPos += 7;
        });
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text("FreshGuard AI Food Freshness Platform • Confidential Business Report", 14, 290);

      doc.save(`${activeReportTab}_audit_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      setSuccessNotice(`Generated PDF report successfully.`);
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0047AB] via-[#003882] to-[#002766] rounded-3xl p-6 text-white border-2 border-[#FFC700]/60 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FFC700]/20 border border-[#FFC700]/40 flex items-center justify-center">
            <FileText className="w-6 h-6 text-[#FFC700]" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">Reports & Corporate Export Center</h2>
            <p className="text-xs sm:text-sm text-blue-100 font-medium">
              Export verified audit documentation, shelf-life forecasts, and compliance logs in PDF & Excel formats.
            </p>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleExportPDF}
            disabled={exporting || loading || !reportData}
            className="flex-1 md:flex-none px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => handleExportExcel(activeReportTab)}
            disabled={exporting || loading}
            className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel / CSV</span>
          </button>
        </div>
      </div>

      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
        {[
          { id: 'freshness', label: 'Freshness & Quality Audit', icon: BarChart2 },
          { id: 'compliance', label: 'Storage & Cold-Chain Compliance', icon: ShieldCheck },
          { id: 'waste', label: 'Waste Reduction & Loss Recovery', icon: Trash2 },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                activeReportTab === tab.id
                  ? 'bg-[#0047AB] text-white shadow-md border-b-2 border-[#FFC700]'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50/70'
              }`}
            >
              <Icon className="w-4 h-4 text-[#FFC700]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Content View */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <RefreshCw className="w-8 h-8 text-[#0047AB] animate-spin mx-auto mb-3" />
          <p className="font-bold text-slate-700">Compiling official audit dataset...</p>
        </div>
      ) : !reportData ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
          No report data available.
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: FRESHNESS AUDIT */}
          {activeReportTab === 'freshness' && (
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <p className="text-xs text-slate-500 font-bold uppercase">Total Batches</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{reportData.total_items}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <p className="text-xs text-slate-500 font-bold uppercase">Average Freshness</p>
                  <p className="text-2xl font-black text-[#0047AB] mt-1">{reportData.average_freshness_score}%</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <p className="text-xs text-slate-500 font-bold uppercase">Grade A Quality</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{reportData.grade_distribution?.["Grade A"] || 0}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <p className="text-xs text-slate-500 font-bold uppercase">Approaching Expiry</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">{reportData.status_distribution?.["Approaching Expiry"] || 0}</p>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-800">Freshness & Shelf-Life Quality Roster</h4>
                  <span className="text-xs text-slate-500">{reportData.items?.length || 0} batches listed</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Batch Number</th>
                        <th className="p-3">Location</th>
                        <th className="p-3">Packaging</th>
                        <th className="p-3">Score</th>
                        <th className="p-3">Grade</th>
                        <th className="p-3">Days Left</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(reportData.items || []).map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-bold text-slate-900">{item.name}</td>
                          <td className="p-3 text-slate-600 font-mono text-[11px]">{item.batch_number}</td>
                          <td className="p-3 text-slate-700">{item.storage_location}</td>
                          <td className="p-3 text-slate-600">{item.packaging_type}</td>
                          <td className="p-3">
                            <span className="font-bold text-[#0047AB]">{item.freshness_score}%</span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              item.quality_grade === 'Grade A' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {item.quality_grade}
                            </span>
                          </td>
                          <td className="p-3 font-bold">{item.days_until_expiry}d</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              item.status === 'Fresh' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COMPLIANCE AUDIT */}
          {activeReportTab === 'compliance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <p className="text-xs text-slate-500 font-bold uppercase">Total Zones</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{reportData.total_zones}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <p className="text-xs text-slate-500 font-bold uppercase">Compliant Facilities</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{reportData.compliant_zones}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <p className="text-xs text-slate-500 font-bold uppercase">Compliance Rate</p>
                  <p className="text-2xl font-black text-[#0047AB] mt-1">{reportData.overall_compliance_rate_pct}%</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h4 className="text-sm font-black text-slate-800">Cold-Chain Storage Zone Audit</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Zone Name</th>
                        <th className="p-3">Facility Type</th>
                        <th className="p-3">Temperature</th>
                        <th className="p-3">Humidity</th>
                        <th className="p-3">Door</th>
                        <th className="p-3">Power</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(reportData.zones || []).map((z, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-bold text-slate-900">{z.zone_name}</td>
                          <td className="p-3 text-slate-600">{z.zone_type}</td>
                          <td className="p-3 font-bold">{z.temperature_c}°C</td>
                          <td className="p-3 font-bold">{z.humidity_pct}%</td>
                          <td className="p-3 text-slate-700">{z.door_status}</td>
                          <td className="p-3 text-slate-700">{z.power_status}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              z.compliance_status === 'Compliant' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {z.compliance_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WASTE REDUCTION */}
          {activeReportTab === 'waste' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <p className="text-xs text-slate-500 font-bold uppercase">Estimated Expired Loss</p>
                  <p className="text-2xl font-black text-rose-600 mt-1">₹{reportData.expired_loss_value_usd ?? reportData.expired_loss_value_inr ?? 0}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <p className="text-xs text-slate-500 font-bold uppercase">Recoverable Potential</p>
                  <p className="text-2xl font-black text-emerald-600 mt-1">₹{reportData.at_risk_recoverable_usd ?? reportData.at_risk_recoverable_inr ?? 0}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <p className="text-xs text-slate-500 font-bold uppercase">Diversion Efficiency</p>
                  <p className="text-2xl font-black text-[#0047AB] mt-1">{reportData.diversion_rate_pct}%</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
                <h4 className="text-sm font-black text-slate-800">Priority Waste Rescue Candidates</h4>
                <div className="space-y-2">
                  {(reportData.rescue_candidates || []).map((c, i) => (
                    <div key={i} className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-xs text-slate-900">{c.name} (Batch {c.batch})</p>
                        <p className="text-[11px] text-slate-600">{c.quantity} units at {c.location} • {c.suggested_action}</p>
                      </div>
                      <div className="text-right sm:text-right">
                        <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          +₹{c.estimated_recovery} recovery
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
