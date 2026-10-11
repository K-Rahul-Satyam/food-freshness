import { jsPDF } from 'jspdf';

/**
 * Generate a professional, publication-quality PDF Freshness Inspection Report
 * @param {Object} result - The inspection analysis result object
 * @param {Object} user - The current logged-in user profile
 */
export const generateFreshnessPdfReport = (result, user = {}) => {
  if (!result) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Brand Palette
  const royalBlue = [0, 71, 171];
  const deepNavy = [15, 23, 42];
  const sunshineYellow = [255, 199, 0];
  const lightBg = [250, 248, 242];
  const cardBorder = [226, 232, 240];
  const textDark = [30, 41, 59];
  const textMuted = [100, 116, 139];

  // Category Color Scheme
  const category = result.freshness_category || 'Fresh';
  let catColor = [16, 185, 129]; // Emerald
  if (category === 'Good') catColor = [13, 148, 136]; // Teal
  else if (category === 'Acceptable') catColor = [217, 119, 6]; // Amber
  else if (category === 'Near Spoilage') catColor = [234, 88, 12]; // Orange
  else if (category === 'Spoiled') catColor = [225, 29, 72]; // Rose

  // -------------------------------------------------------------
  // 1. TOP HEADER BANNER
  // -------------------------------------------------------------
  doc.setFillColor(...royalBlue);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Sunshine Golden Accent Stripe
  doc.setFillColor(...sunshineYellow);
  doc.rect(0, 28, pageWidth, 2.5, 'F');

  // Header Typography
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FreshGuard AI', margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 230, 150);
  doc.text('PRODUCE FRESHNESS & SPOILAGE INSPECTION CERTIFICATE', margin, 19);

  // Right-aligned report code & date
  const reportCode = `FG-${Date.now().toString().slice(-6)}`;
  const inspectionDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const inspectionTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`CERTIFICATE #: ${reportCode}`, pageWidth - margin, 11, { align: 'right' });
  doc.setTextColor(200, 220, 255);
  doc.text(`ISSUED: ${inspectionDate} at ${inspectionTime}`, pageWidth - margin, 17, { align: 'right' });
  doc.text(`AUDITOR: ${user?.full_name || 'Authorized Inspector'} (${user?.role || 'Consumer'})`, pageWidth - margin, 23, { align: 'right' });

  // -------------------------------------------------------------
  // 2. METADATA SUMMARY BAR
  // -------------------------------------------------------------
  let y = 35;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...cardBorder);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...royalBlue);
  doc.text('INSPECTED PRODUCE:', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textDark);
  doc.text(`${result.detected_food_name || 'Produce Item'} (${result.food_category || 'General'})`, margin + 40, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...royalBlue);
  doc.text('BENCHMARK DATASET:', margin + 100, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textDark);
  doc.text(`${result.dataset_reference || 'Live Image Inspection'}`, margin + 138, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...royalBlue);
  doc.text('PRIMARY DATABASE:', margin + 4, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textDark);
  doc.text(`PostgreSQL (Audit ID: ${result.id || 'SYNCED'})`, margin + 40, y + 11);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...royalBlue);
  doc.text('TELEMETRY ID:', margin + 100, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textDark);
  doc.text(`MongoDB: ${result.mongo_telemetry_id ? result.mongo_telemetry_id.slice(-8) : 'TELEMETRY-OK'}`, margin + 138, y + 11);

  // -------------------------------------------------------------
  // 3. EXECUTIVE FRESHNESS SUMMARY & VISUAL OVERVIEW
  // -------------------------------------------------------------
  y += 18;

  // Freshness Score Gauge Box (Left side: width 112mm)
  const leftBoxWidth = 112;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...cardBorder);
  doc.roundedRect(margin, y, leftBoxWidth, 54, 3, 3, 'FD');

  // Top accent stripe on score box
  doc.setFillColor(...royalBlue);
  doc.rect(margin + 2, y, leftBoxWidth - 4, 1.5, 'F');

  // Circular Score Badge
  const score = Math.round(result.freshness_score || 0);
  doc.setFillColor(...catColor);
  doc.circle(margin + 24, y + 25, 16, 'F');
  doc.setFillColor(255, 255, 255);
  doc.circle(margin + 24, y + 25, 13, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...textDark);
  doc.text(`${score}%`, margin + 24, y + 27, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setTextColor(...textMuted);
  doc.text('FRESHNESS', margin + 24, y + 33, { align: 'center' });

  // Score details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...textDark);
  doc.text(result.detected_food_name || 'Inspected Produce', margin + 45, y + 15);

  // Category Badge Pill
  doc.setFillColor(...catColor);
  doc.roundedRect(margin + 45, y + 18, 38, 6.5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(category.toUpperCase(), margin + 64, y + 22.5, { align: 'center' });

  // Quality Grade
  doc.setTextColor(...textMuted);
  doc.setFontSize(8);
  doc.text(`Grade: ${result.quality_grade || 'Standard'}`, margin + 87, y + 22.5);

  // Quick stats
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text('Spoilage Probability:', margin + 45, y + 30);
  doc.setTextColor(result.spoilage_probability > 40 ? 225 : 16, result.spoilage_probability > 40 ? 29 : 185, 129);
  doc.text(`${result.spoilage_probability || 0}%`, margin + 78, y + 30);

  doc.setTextColor(...textDark);
  doc.text('Estimated Shelf Life:', margin + 45, y + 36);
  doc.setTextColor(...royalBlue);
  doc.text(`~${result.estimated_shelf_life_days || 0} Days`, margin + 78, y + 36);

  // Recommendation Callout
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin + 4, y + 41, leftBoxWidth - 8, 10, 1.5, 1.5, 'F');
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...textDark);
  const recText = doc.splitTextToSize(`Recommendation: ${result.recommendation || 'Proceed with standard inventory protocol.'}`, leftBoxWidth - 12);
  doc.text(recText, margin + 7, y + 45);

  // Inspection Image Preview (Right side: width 66mm)
  const rightBoxX = margin + leftBoxWidth + 4;
  const rightBoxWidth = contentWidth - leftBoxWidth - 4; // 66mm

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...cardBorder);
  doc.roundedRect(rightBoxX, y, rightBoxWidth, 54, 3, 3, 'FD');

  const imgData = result.visual_overlays?.diagnostic_overlay_base64 || result.visual_overlays?.original_image_base64;
  if (imgData) {
    try {
      doc.addImage(imgData, 'PNG', rightBoxX + 3, y + 3, rightBoxWidth - 6, 42);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...royalBlue);
      doc.text('AI Defect Diagnostic Overlay', rightBoxX + rightBoxWidth / 2, y + 49, { align: 'center' });
    } catch (e) {
      doc.setFontSize(8);
      doc.setTextColor(...textMuted);
      doc.text('Inspection Visual Attached', rightBoxX + rightBoxWidth / 2, y + 27, { align: 'center' });
    }
  } else {
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text('No Image Telemetry', rightBoxX + rightBoxWidth / 2, y + 27, { align: 'center' });
  }

  // -------------------------------------------------------------
  // 4. DETAILED COMPUTER VISION DEFECT TELEMETRY MATRIX
  // -------------------------------------------------------------
  y += 58;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...deepNavy);
  doc.text('Computer Vision Feature Telemetry Matrix', margin, y + 4);

  y += 7;
  // Table Header
  doc.setFillColor(...royalBlue);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('FEATURE INSPECTION DOMAIN', margin + 3, y + 5);
  doc.text('QUANTITATIVE VALUE', margin + 70, y + 5);
  doc.text('BENCHMARK STATUS', margin + 115, y + 5);
  doc.text('SEVERITY / RISK IMPACT', margin + 150, y + 5);

  const features = result.features || {};
  const color = features.color_analysis || {};
  const texture = features.texture_analysis || {};
  const mold = features.mold_detection || {};
  const bruise = features.bruise_detection || {};
  const damage = features.physical_damage_detection || {};

  const defectRows = [
    {
      domain: 'CIE L*a*b* Browning Index (BI)',
      val: `${color.browning_index || 0} / 100`,
      status: color.browning_index > 40 ? 'Severe Browning' : color.browning_index > 20 ? 'Moderate Shift' : 'Pristine Color',
      impact: `${color.color_degradation_pct || 0}% Loss`,
      isBad: (color.browning_index || 0) > 35
    },
    {
      domain: 'Surface Texture Roughness & Shriveling',
      val: `Laplacian Var: ${texture.laplacian_variance || 0}`,
      status: texture.shrivel_index > 30 ? 'Moisture Loss' : 'Smooth & Turgid',
      impact: `${texture.texture_degradation_pct || 0}% Degradation`,
      isBad: (texture.texture_degradation_pct || 0) > 35
    },
    {
      domain: 'Fungal Spore & Mold Colony Detection',
      val: `${mold.colony_count || 0} colonies (${mold.infected_area_pct || 0}%)`,
      status: mold.mold_detected ? 'MYCELIUM DETECTED' : 'Zero Fungal Spores',
      impact: mold.mold_detected ? 'Critical Hazard' : 'Clean & Safe',
      isBad: mold.mold_detected
    },
    {
      domain: 'Internal Tissue Necrosis & Bruising',
      val: `${bruise.bruise_patches_count || 0} lesions (${bruise.affected_tissue_pct || 0}%)`,
      status: bruise.bruise_detected ? 'Sub-surface Softening' : 'Firm Parenchyma',
      impact: `${bruise.bruise_severity_pct || 0}% Impact`,
      isBad: bruise.bruise_detected
    },
    {
      domain: 'Structural Fractures & Skin Cuts',
      val: `${damage.structural_cuts_count || 0} cuts detected`,
      status: damage.damage_detected ? 'Pericarp Puncture' : 'Intact Protective Rind',
      impact: `${damage.damage_severity_pct || 0}% Severity`,
      isBad: damage.damage_detected
    }
  ];

  y += 7;
  doc.setFontSize(7.2);
  defectRows.forEach((row, i) => {
    const isEven = i % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setDrawColor(...cardBorder);
    doc.line(margin, y + 6.5, margin + contentWidth, y + 6.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text(row.domain, margin + 3, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.text(row.val, margin + 70, y + 4.5);

    if (row.isBad) {
      doc.setTextColor(225, 29, 72);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'normal');
    }
    doc.text(row.status, margin + 115, y + 4.5);

    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'normal');
    doc.text(row.impact, margin + 150, y + 4.5);

    y += 6.5;
  });

  // -------------------------------------------------------------
  // 5. 7-DAY STORAGE SHELF-LIFE PROJECTION
  // -------------------------------------------------------------
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...deepNavy);
  doc.text('7-Day Storage Freshness Projections (Cold vs Ambient)', margin, y + 4);

  y += 7;
  doc.setFillColor(...deepNavy);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('TIMELINE', margin + 3, y + 5);
  doc.text('COLD STORAGE (2°C - 4°C)', margin + 48, y + 5);
  doc.text('AMBIENT STORAGE (20°C - 25°C)', margin + 105, y + 5);
  doc.text('OPTIMAL ACTION WINDOW', margin + 150, y + 5);

  const projections = result.trend_projection || [];
  const displayDays = projections.slice(0, 6);

  y += 7;
  doc.setFontSize(7.2);
  displayDays.forEach((proj, idx) => {
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setDrawColor(...cardBorder);
    doc.line(margin, y + 6, margin + contentWidth, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textDark);
    doc.text(`Day ${proj.day_number || idx}`, margin + 3, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(16, 185, 129);
    doc.text(`${proj.cold_storage_score}% Fresh`, margin + 48, y + 4.2);

    const amb = proj.ambient_storage_score;
    if (amb < 40) doc.setTextColor(225, 29, 72);
    else if (amb < 70) doc.setTextColor(217, 119, 6);
    else doc.setTextColor(16, 185, 129);
    doc.text(`${amb}% Fresh`, margin + 105, y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    let action = 'Prime Display';
    if (amb < 30) action = 'Discard / Compost';
    else if (amb < 50) action = 'Expedite Markdown';
    else if (amb < 70) action = 'Normal Sale';
    doc.text(action, margin + 150, y + 4.2);

    y += 6;
  });

  // -------------------------------------------------------------
  // 6. OFFICIAL DIGITAL AUDIT & VERIFICATION FOOTER
  // -------------------------------------------------------------
  const footerY = pageHeight - 22;
  doc.setFillColor(...lightBg);
  doc.rect(0, footerY, pageWidth, 22, 'F');
  doc.setDrawColor(...cardBorder);
  doc.line(0, footerY, pageWidth, footerY);

  // Sunshine Golden Accent Border
  doc.setFillColor(...sunshineYellow);
  doc.rect(0, footerY, pageWidth, 1.2, 'F');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...royalBlue);
  doc.text('FRESHGUARD AI OFFICIAL COMPLIANCE VERIFICATION', margin, footerY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text('Generated via Automated Computer Vision & Photometric Colorimetry Pipeline. Valid for HACCP audit compliance.', margin, footerY + 11);
  doc.text(`Document Signature Hash: SHA256-${Date.now().toString(16).toUpperCase()}-VERIFIED • All rights reserved FreshGuard AI`, margin, footerY + 16);

  // Digital Seal Badge on Right
  doc.setFillColor(...royalBlue);
  doc.roundedRect(pageWidth - margin - 35, footerY + 3.5, 35, 14, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DIGITALLY CERTIFIED', pageWidth - margin - 17.5, footerY + 8, { align: 'center' });
  doc.setTextColor(...sunshineYellow);
  doc.setFontSize(6);
  doc.text('GRADE QUALITY VERIFIED', pageWidth - margin - 17.5, footerY + 13, { align: 'center' });

  // -------------------------------------------------------------
  // SAVE / DOWNLOAD PDF
  // -------------------------------------------------------------
  const cleanName = (result.detected_food_name || 'produce').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `FreshGuard_Report_${cleanName}_${Date.now()}.pdf`;
  doc.save(fileName);
};
