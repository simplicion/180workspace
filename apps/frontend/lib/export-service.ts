/**
 * Centralized Enterprise Export Service
 * Supports exporting data tables and reports to Excel (.xlsx/.xls), PDF (.pdf), Word (.docx), and CSV (.csv)
 * with 180workspace branding, formatted summary statistics, and visual graph/chart representations.
 */

export interface ExportColumn {
  header: string;
  key: string;
  width?: number; // Approximate width for Word/Excel
  render?: (val: any, row: any) => string;
}

export interface SummaryMetric {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export interface ExportChartData {
  dailyTrend?: { day: string; dateStr: string; total: number; newLeads: number; contacted: number }[];
  statusDistribution?: { name: string; value: number }[];
}

export interface ExportOptions {
  filename?: string;
  title: string;
  subtitle?: string;
  companyName?: string;
  metadata?: Record<string, string>;
  summaryMetrics?: SummaryMetric[];
  chartData?: ExportChartData;
  columns: ExportColumn[];
  data: any[];
}

/**
 * Helper to download Blob as a file in the browser
 */
export function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Clean & sanitize filename
 */
export function sanitizeFilename(name: string, ext: string): string {
  const clean = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 50);
  const dateStr = new Date().toISOString().slice(0, 10);
  return `${clean || 'export'}_${dateStr}.${ext}`;
}

/**
 * 1. Export to Formatted Excel Spreadsheet (XML Spreadsheet 2003 / .xlsx compatible format)
 * Includes 180workspace enterprise branding, KPI summary cards, Stage Distribution, Daily Activity Table, and Master Data.
 */
export async function exportToExcel(options: ExportOptions): Promise<void> {
  const {
    title,
    subtitle = 'Exported from 180workspace Platform',
    companyName = '180workspace Enterprise',
    metadata = {},
    summaryMetrics = [],
    chartData,
    columns,
    data,
    filename = sanitizeFilename(options.title || 'leads_report', 'xls')
  } = options;

  const escapeXml = (unsafe: any) => {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const nowStr = new Date().toLocaleString();

  // Build XML Spreadsheet 2003 content
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>${escapeXml(companyName)}</Author>
  <Title>${escapeXml(title)}</Title>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#333333"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <!-- Brand Banner Style -->
  <Style ss:ID="BrandBanner">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="15" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
  </Style>
  <!-- Section Header -->
  <Style ss:ID="SectionHeader">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#1E1B4B"/>
   <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C7D2FE"/>
   </Borders>
  </Style>
  <!-- Subtitle & Timestamps -->
  <Style ss:ID="SubHeader">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Italic="1" ss:Color="#6B7280"/>
   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
  </Style>
  <!-- Metric Card Header -->
  <Style ss:ID="MetricLabel">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#4B5563"/>
   <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C7D2FE"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C7D2FE"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C7D2FE"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C7D2FE"/>
   </Borders>
  </Style>
  <Style ss:ID="MetricValue">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="12" ss:Bold="1" ss:Color="#3730A3"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C7D2FE"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C7D2FE"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C7D2FE"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C7D2FE"/>
   </Borders>
  </Style>
  <!-- Mini Table Header -->
  <Style ss:ID="MiniTableHeader">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#374151"/>
   <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
   </Borders>
  </Style>
  <!-- Table Header -->
  <Style ss:ID="TableHeader">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#312E81" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1E1B4B"/>
   </Borders>
  </Style>
  <!-- Table Row Alternating -->
  <Style ss:ID="TableRowEven">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#1F2937"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <Style ss:ID="TableRowOdd">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#1F2937"/>
   <Interior ss:Color="#F9FAFB" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
  <!-- Meta Key/Value -->
  <Style ss:ID="MetaLabel">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#6B7280"/>
  </Style>
  <Style ss:ID="MetaValue">
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Color="#111827"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Leads Report">
  <Table ss:DefaultRowHeight="20">
`;

  // Set column widths
  columns.forEach((col, idx) => {
    const width = col.width || 130;
    xml += `   <Column ss:Index="${idx + 1}" ss:Width="${width}"/>\n`;
  });

  const totalCols = Math.max(columns.length, 6);

  // 1. Title Banner Row
  xml += `   <Row ss:Height="36">
    <Cell ss:MergeAcross="${totalCols - 1}" ss:StyleID="BrandBanner">
     <Data ss:Type="String">  📊 ${escapeXml(title)}  [${escapeXml(companyName)}]</Data>
    </Cell>
   </Row>\n`;

  // 2. Subtitle / Timestamp Row
  xml += `   <Row ss:Height="22">
    <Cell ss:MergeAcross="${totalCols - 1}" ss:StyleID="SubHeader">
     <Data ss:Type="String">  ${escapeXml(subtitle)} • Generated: ${escapeXml(nowStr)}</Data>
    </Cell>
   </Row>\n`;

  // 3. Metadata Rows
  const metaKeys = Object.keys(metadata);
  if (metaKeys.length > 0) {
    xml += `   <Row ss:Height="8"><Cell/></Row>\n`;
    metaKeys.forEach(k => {
      xml += `   <Row ss:Height="18">
      <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">${escapeXml(k)}:</Data></Cell>
      <Cell ss:MergeAcross="${totalCols - 2}" ss:StyleID="MetaValue"><Data ss:Type="String">${escapeXml(metadata[k])}</Data></Cell>
     </Row>\n`;
    });
  }

  // 4. Summary Metrics Cards (if any)
  if (summaryMetrics.length > 0) {
    xml += `   <Row ss:Height="10"><Cell/></Row>\n`;
    // Metric Labels Row
    xml += `   <Row ss:Height="20">\n`;
    summaryMetrics.slice(0, totalCols).forEach(m => {
      xml += `    <Cell ss:StyleID="MetricLabel"><Data ss:Type="String">${escapeXml(m.label)}</Data></Cell>\n`;
    });
    xml += `   </Row>\n`;
    // Metric Values Row
    xml += `   <Row ss:Height="24">\n`;
    summaryMetrics.slice(0, totalCols).forEach(m => {
      xml += `    <Cell ss:StyleID="MetricValue"><Data ss:Type="String">${escapeXml(String(m.value))}</Data></Cell>\n`;
    });
    xml += `   </Row>\n`;
  }

  // 5. Stage Distribution Breakdown Table (Graph Data in Excel)
  if (chartData?.statusDistribution && chartData.statusDistribution.length > 0) {
    const totalLeads = data.length || 1;
    xml += `   <Row ss:Height="14"><Cell/></Row>\n`;
    xml += `   <Row ss:Height="22">
      <Cell ss:MergeAcross="${totalCols - 1}" ss:StyleID="SectionHeader">
       <Data ss:Type="String">📈 Pipeline Stage & Lead Status Breakdown</Data>
      </Cell>
     </Row>\n`;
    xml += `   <Row ss:Height="20">
      <Cell ss:StyleID="MiniTableHeader"><Data ss:Type="String">Pipeline Stage</Data></Cell>
      <Cell ss:StyleID="MiniTableHeader"><Data ss:Type="String">Lead Count</Data></Cell>
      <Cell ss:StyleID="MiniTableHeader"><Data ss:Type="String">Share (%)</Data></Cell>
     </Row>\n`;
    chartData.statusDistribution.forEach((st) => {
      const share = Math.round((st.value / totalLeads) * 1000) / 10;
      xml += `   <Row ss:Height="18">
        <Cell ss:StyleID="TableRowEven"><Data ss:Type="String">${escapeXml(st.name)}</Data></Cell>
        <Cell ss:StyleID="TableRowEven"><Data ss:Type="Number">${st.value}</Data></Cell>
        <Cell ss:StyleID="TableRowEven"><Data ss:Type="String">${share}%</Data></Cell>
       </Row>\n`;
    });
  }

  // 6. Daily Activity Trends Breakdown (if active days exist)
  if (chartData?.dailyTrend && chartData.dailyTrend.some(d => d.total > 0)) {
    const activeDays = chartData.dailyTrend.filter(d => d.total > 0);
    xml += `   <Row ss:Height="14"><Cell/></Row>\n`;
    xml += `   <Row ss:Height="22">
      <Cell ss:MergeAcross="${totalCols - 1}" ss:StyleID="SectionHeader">
       <Data ss:Type="String">📅 Daily Inbound Activity Trends</Data>
      </Cell>
     </Row>\n`;
    xml += `   <Row ss:Height="20">
      <Cell ss:StyleID="MiniTableHeader"><Data ss:Type="String">Date</Data></Cell>
      <Cell ss:StyleID="MiniTableHeader"><Data ss:Type="String">Total Inbound Leads</Data></Cell>
      <Cell ss:StyleID="MiniTableHeader"><Data ss:Type="String">New Leads</Data></Cell>
      <Cell ss:StyleID="MiniTableHeader"><Data ss:Type="String">Contacted</Data></Cell>
     </Row>\n`;
    activeDays.forEach(day => {
      xml += `   <Row ss:Height="18">
        <Cell ss:StyleID="TableRowEven"><Data ss:Type="String">${escapeXml(day.dateStr)}</Data></Cell>
        <Cell ss:StyleID="TableRowEven"><Data ss:Type="Number">${day.total}</Data></Cell>
        <Cell ss:StyleID="TableRowEven"><Data ss:Type="Number">${day.newLeads}</Data></Cell>
        <Cell ss:StyleID="TableRowEven"><Data ss:Type="Number">${day.contacted}</Data></Cell>
       </Row>\n`;
    });
  }

  xml += `   <Row ss:Height="16"><Cell/></Row>\n`;
  xml += `   <Row ss:Height="22">
    <Cell ss:MergeAcross="${totalCols - 1}" ss:StyleID="SectionHeader">
     <Data ss:Type="String">📋 Master Lead Submissions Record</Data>
    </Cell>
   </Row>\n`;

  // 7. Table Header Row
  xml += `   <Row ss:Height="26">\n`;
  columns.forEach(col => {
    xml += `    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXml(col.header)}</Data></Cell>\n`;
  });
  xml += `   </Row>\n`;

  // 8. Table Data Rows
  data.forEach((row, rowIdx) => {
    const styleId = rowIdx % 2 === 0 ? 'TableRowEven' : 'TableRowOdd';
    xml += `   <Row ss:Height="22">\n`;
    columns.forEach(col => {
      const rawVal = row[col.key];
      const val = col.render ? col.render(rawVal, row) : rawVal ?? '';
      const isNum = typeof val === 'number';
      const dataType = isNum ? 'Number' : 'String';
      xml += `    <Cell ss:StyleID="${styleId}"><Data ss:Type="${dataType}">${escapeXml(val)}</Data></Cell>\n`;
    });
    xml += `   </Row>\n`;
  });

  // 9. Footer Row
  xml += `   <Row ss:Height="12"><Cell/></Row>\n`;
  xml += `   <Row ss:Height="20">
    <Cell ss:MergeAcross="${totalCols - 1}" ss:StyleID="SubHeader">
     <Data ss:Type="String">  Total Records: ${data.length} • Powered by 180workspace Centralized Export Engine</Data>
    </Cell>
   </Row>\n`;

  xml += `  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <Selected/>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  downloadBlob(blob, filename.endsWith('.xls') || filename.endsWith('.xlsx') ? filename : `${filename}.xls`);
}

/**
 * 2. Export to Branded PDF Report with Visual HTML Graphs
 * Uses jsPDF and html2canvas with executive styling, metric summary cards, visual bar/stage charts, and tables.
 */
export async function exportToPDF(options: ExportOptions): Promise<void> {
  if (typeof window === 'undefined') return;

  const {
    title,
    subtitle = 'Exported from 180workspace Platform',
    companyName = '180workspace Enterprise',
    metadata = {},
    summaryMetrics = [],
    chartData,
    columns,
    data,
    filename = sanitizeFilename(options.title || 'leads_report', 'pdf')
  } = options;

  const { default: jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  // Build clean HTML container for rendering
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.padding = '32px';
  container.style.backgroundColor = '#ffffff';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.color = '#1f2937';

  let html = `
    <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="display: inline-block; width: 12px; height: 12px; background: #4f46e5; border-radius: 3px;"></span>
          <span style="font-size: 11px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.05em;">${companyName}</span>
        </div>
        <h1 style="font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 4px 0; letter-spacing: -0.02em;">${title}</h1>
        <p style="font-size: 11px; color: #6b7280; margin: 0;">${subtitle}</p>
      </div>
      <div style="text-align: right; font-size: 10px; color: #9ca3af;">
        <div>Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div>Records: <strong>${data.length}</strong></div>
      </div>
    </div>
  `;

  // Summary Metrics Section
  if (summaryMetrics.length > 0) {
    html += `
      <div style="display: grid; grid-template-columns: repeat(${Math.min(summaryMetrics.length, 6)}, 1fr); gap: 8px; margin-bottom: 18px;">
        ${summaryMetrics.map(m => `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 6px; text-align: center;">
            <div style="font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 2px;">${m.label}</div>
            <div style="font-size: 15px; font-weight: 800; color: ${m.highlight ? '#4f46e5' : '#0f172a'};">${m.value}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Visual Graphs & Stage Distribution Section (PDF Visual Rendering)
  const hasStatusCharts = chartData?.statusDistribution && chartData.statusDistribution.length > 0;
  const hasDailyTrends = chartData?.dailyTrend && chartData.dailyTrend.some(d => d.total > 0);

  if (hasStatusCharts || hasDailyTrends) {
    const totalLeads = data.length || 1;
    const stageColors = ['#4f46e5', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e'];

    html += `
      <div style="display: grid; grid-template-columns: ${hasStatusCharts && hasDailyTrends ? '1fr 1fr' : '1fr'}; gap: 14px; margin-bottom: 20px;">
        ${hasStatusCharts ? `
          <div style="background: #fdfdfd; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
            <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
              <span>🍩 Lead Pipeline Stage Distribution</span>
              <span style="font-size: 9px; color: #64748b;">${data.length} Total</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${chartData!.statusDistribution!.map((st, idx) => {
                const pct = Math.round((st.value / totalLeads) * 100);
                const color = stageColors[idx % stageColors.length];
                return `
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
                      <span style="color: #334155; font-weight: 600;">${st.name}</span>
                      <span style="color: #64748b;">${st.value} (${pct}%)</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
                      <div style="width: ${pct}%; height: 100%; background: ${color}; border-radius: 3px;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        ${hasDailyTrends ? `
          <div style="background: #fdfdfd; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;">
            <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">
              <span>📈 Daily Activity Trajectory</span>
            </div>
            <div style="display: flex; align-items: flex-end; gap: 4px; height: 80px; padding-top: 10px; border-bottom: 1px solid #e2e8f0;">
              ${(() => {
                const activeDays = chartData!.dailyTrend!.filter(d => d.total > 0).slice(-10);
                const maxVal = Math.max(...activeDays.map(d => d.total), 1);
                return activeDays.map(d => {
                  const barH = Math.max(12, Math.round((d.total / maxVal) * 65));
                  return `
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                      <span style="font-size: 8px; font-weight: 700; color: #4f46e5;">${d.total}</span>
                      <div style="width: 100%; height: ${barH}px; background: linear-gradient(180deg, #4f46e5 0%, #818cf8 100%); border-radius: 3px 3px 0 0;"></div>
                      <span style="font-size: 7px; color: #94a3b8; white-space: nowrap;">${d.day}</span>
                    </div>
                  `;
                }).join('');
              })()}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Metadata pill bar
  const metaEntries = Object.entries(metadata);
  if (metaEntries.length > 0) {
    html += `
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; font-size: 10px;">
        ${metaEntries.map(([k, v]) => `
          <span style="background: #f1f5f9; padding: 3px 8px; border-radius: 4px; color: #475569;">
            <strong style="color: #1e293b;">${k}:</strong> ${v}
          </span>
        `).join('')}
      </div>
    `;
  }

  // Data Table
  html += `
    <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: left;">
      <thead>
        <tr style="background: #312e81; color: #ffffff;">
          ${columns.map(col => `
            <th style="padding: 8px 10px; font-weight: 700; border-bottom: 2px solid #1e1b4b;">${col.header}</th>
          `).join('')}
        </tr>
      </thead>
      <tbody>
        ${data.length === 0 ? `
          <tr><td colspan="${columns.length}" style="padding: 20px; text-align: center; color: #9ca3af;">No records found.</td></tr>
        ` : data.map((row, idx) => `
          <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
            ${columns.map(col => {
              const raw = row[col.key];
              const val = col.render ? col.render(raw, row) : raw ?? '—';
              return `<td style="padding: 6px 10px; color: #334155; word-break: break-word;">${val}</td>`;
            }).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;">
      <span>180workspace Platform • Enterprise Confidential</span>
      <span>Page 1 of 1</span>
    </div>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4'
    });

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * 3. Export to Branded Word Document (.docx)
 * Constructs styled tables, metric summary boxes, stage breakdowns, and lead responses.
 */
export async function exportToDOCX(options: ExportOptions): Promise<void> {
  if (typeof window === 'undefined') return;

  const {
    title,
    subtitle = 'Exported from 180workspace Platform',
    companyName = '180workspace Enterprise',
    metadata = {},
    summaryMetrics = [],
    chartData,
    columns,
    data,
    filename = sanitizeFilename(options.title || 'leads_report', 'docx')
  } = options;

  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    Table,
    TableRow,
    TableCell,
    WidthType,
    ShadingType
  } = await import('docx');

  const children: any[] = [];

  // Title & Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${companyName.toUpperCase()}`,
          bold: true,
          size: 18,
          color: '4F46E5'
        })
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${subtitle} | Generated: ${new Date().toLocaleString()} | Total Records: ${data.length}`,
          italics: true,
          size: 18,
          color: '6B7280'
        })
      ],
      spacing: { after: 300 }
    })
  );

  // Metadata paragraph
  const metaEntries = Object.entries(metadata);
  if (metaEntries.length > 0) {
    const metaRuns: any[] = [];
    metaEntries.forEach(([k, v], idx) => {
      metaRuns.push(
        new TextRun({ text: `${k}: `, bold: true, size: 18 }),
        new TextRun({ text: `${v}${idx < metaEntries.length - 1 ? '   |   ' : ''}`, size: 18 })
      );
    });
    children.push(
      new Paragraph({
        children: metaRuns,
        spacing: { after: 200 }
      })
    );
  }

  // Summary Metrics Table (if any)
  if (summaryMetrics.length > 0) {
    const metricCols = summaryMetrics.slice(0, 6);
    const colWidthPct = 100 / metricCols.length;

    const metricHeaderRow = new TableRow({
      children: metricCols.map(m => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: m.label, bold: true, size: 16, color: '4B5563' })], alignment: AlignmentType.CENTER })],
        shading: { fill: 'EEF2FF', type: ShadingType.CLEAR },
        width: { size: colWidthPct, type: WidthType.PERCENTAGE }
      }))
    });

    const metricValueRow = new TableRow({
      children: metricCols.map(m => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: String(m.value), bold: true, size: 24, color: '3730A3' })], alignment: AlignmentType.CENTER })],
        shading: { fill: 'FFFFFF', type: ShadingType.CLEAR },
        width: { size: colWidthPct, type: WidthType.PERCENTAGE }
      }))
    });

    children.push(
      new Table({
        rows: [metricHeaderRow, metricValueRow],
        width: { size: 100, type: WidthType.PERCENTAGE }
      }),
      new Paragraph({ text: '', spacing: { after: 250 } })
    );
  }

  // Stage Distribution Table in DOCX
  if (chartData?.statusDistribution && chartData.statusDistribution.length > 0) {
    const totalLeads = data.length || 1;
    const stageHeaderRow = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Pipeline Stage', bold: true, size: 18, color: 'FFFFFF' })] })], shading: { fill: '4F46E5', type: ShadingType.CLEAR }, width: { size: 50, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Count', bold: true, size: 18, color: 'FFFFFF' })] })], shading: { fill: '4F46E5', type: ShadingType.CLEAR }, width: { size: 25, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Share %', bold: true, size: 18, color: 'FFFFFF' })] })], shading: { fill: '4F46E5', type: ShadingType.CLEAR }, width: { size: 25, type: WidthType.PERCENTAGE } }),
      ]
    });

    const stageRows = chartData.statusDistribution.map(st => {
      const share = Math.round((st.value / totalLeads) * 100);
      return new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: st.name })], width: { size: 50, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: String(st.value) })], width: { size: 25, type: WidthType.PERCENTAGE } }),
          new TableCell({ children: [new Paragraph({ text: `${share}%` })], width: { size: 25, type: WidthType.PERCENTAGE } })
        ]
      });
    });

    children.push(
      new Paragraph({ text: 'Stage & Distribution Breakdown', heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }),
      new Table({ rows: [stageHeaderRow, ...stageRows], width: { size: 100, type: WidthType.PERCENTAGE } }),
      new Paragraph({ text: '', spacing: { after: 250 } })
    );
  }

  // Main Leads Table
  const tableRows: any[] = [];
  const colWidthPct = 100 / columns.length;

  // Header row
  tableRows.push(
    new TableRow({
      children: columns.map(col => new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: col.header, bold: true, size: 18, color: 'FFFFFF' })]
          })
        ],
        shading: { fill: '312E81', type: ShadingType.CLEAR },
        width: { size: colWidthPct, type: WidthType.PERCENTAGE }
      }))
    })
  );

  // Data rows
  data.forEach((row, rowIdx) => {
    tableRows.push(
      new TableRow({
        children: columns.map(col => {
          const raw = row[col.key];
          const val = col.render ? col.render(raw, row) : raw ?? '—';
          return new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: String(val), size: 16, color: '1F2937' })]
              })
            ],
            shading: { fill: rowIdx % 2 === 0 ? 'FFFFFF' : 'F9FAFB', type: ShadingType.CLEAR },
            width: { size: colWidthPct, type: WidthType.PERCENTAGE }
          });
        })
      })
    );
  });

  children.push(
    new Paragraph({ text: 'Master Lead Submissions Records', heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }),
    new Table({
      rows: tableRows,
      width: { size: 100, type: WidthType.PERCENTAGE }
    }),
    new Paragraph({ text: '', spacing: { after: 200 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Generated securely by 180workspace Centralized Export Engine',
          italics: true,
          size: 16,
          color: '9CA3AF'
        })
      ]
    })
  );

  const doc = new Document({
    sections: [{
      properties: {},
      children
    }]
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename);
}

/**
 * 4. Export to CSV (RFC-4180 UTF-8 with BOM)
 */
export async function exportToCSV(options: ExportOptions): Promise<void> {
  const {
    columns,
    data,
    filename = sanitizeFilename(options.title || 'leads_report', 'csv')
  } = options;

  const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const headers = columns.map(c => escapeCsv(c.header)).join(',');
  const rows = data.map(row => {
    return columns.map(col => {
      const raw = row[col.key];
      const val = col.render ? col.render(raw, row) : raw ?? '';
      return escapeCsv(val);
    }).join(',');
  });

  // Prepend UTF-8 BOM so Excel opens special characters seamlessly
  const csvContent = '\uFEFF' + [headers, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}
