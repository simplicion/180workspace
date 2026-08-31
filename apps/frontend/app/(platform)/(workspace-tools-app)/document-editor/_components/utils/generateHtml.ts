import { Block } from '../../../../../../redux/slices/documentSlice';
import { HEADER_TEMPLATES, FOOTER_TEMPLATES } from '../../../_components/headerFooterTemplates';
import { autoLinkUrls } from './autoLinkUrls';

export function generateHtmlFromBlocks(blocks: Block[], documentDetails: any, designSettings: any, brandConfig?: any, fragmentOnly: boolean = false): string {
  const baseFont = designSettings?.fontFamily || 'sans-serif';
  const baseSize = designSettings?.fontSize || 16;
  const primaryColor = designSettings?.primaryColor || '#2563eb';

  const replaceVars = (text: string) => {
    if (!text) return '';
    let replaced = text;
    
    // Replace primaryColor directly
    replaced = replaced.replace(/{{\s*primaryColor\s*}}/g, primaryColor);

    const fallbackPlaceholders: Record<string, string> = {
      companyName: 'Company Name',
      companyAddress: 'Company Address',
      companyEmail: 'company@example.com',
      companyPhone: '+9999999999',
      companyWebsite: 'www.company.com',
      companyGst: 'TAX-ID-0000',
      authorizedSignatory: 'Authorized Signatory',
    };

    const mergedVars = {
      ...fallbackPlaceholders,
      ...(brandConfig || {}),
      ...(documentDetails || {})
    };

    Object.keys(mergedVars).forEach(key => {
      const val = mergedVars[key] || fallbackPlaceholders[key] || '';
      if (typeof val === 'string' || typeof val === 'number') {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        replaced = replaced.replace(regex, String(val));
      }
    });
    
    // Clean up any remaining unreplaced template variables
    replaced = replaced.replace(/{{\s*[a-zA-Z0-9_]+\s*}}/g, '');
    
    return autoLinkUrls(replaced);
  };

  let finalBlocks = [...blocks];
  
  if (designSettings?.selectedHeaderId && designSettings.selectedHeaderId !== 'none') {
    const template = HEADER_TEMPLATES.find(t => t.id === designSettings.selectedHeaderId);
    if (template) {
      finalBlocks = [...template.blocks, ...finalBlocks];
    }
  }

  if (designSettings?.selectedFooterId && designSettings.selectedFooterId !== 'none') {
    const template = FOOTER_TEMPLATES.find(t => t.id === designSettings.selectedFooterId);
    if (template) {
      finalBlocks = [...finalBlocks, ...template.blocks];
    }
  }

  const blocksHtml = finalBlocks.map(block => {
    if (block.visibilityRule && typeof block.visibilityRule === 'object' && block.visibilityRule.field && block.visibilityRule.operator && block.visibilityRule.value !== undefined) {
      const fieldValue = documentDetails ? documentDetails[block.visibilityRule.field] : undefined;
      const ruleValue = block.visibilityRule.value;
      
      let isVisible = true;
      switch (block.visibilityRule.operator) {
        case 'equals': isVisible = fieldValue === ruleValue; break;
        case 'not_equals': isVisible = fieldValue !== ruleValue; break;
        case 'contains': isVisible = String(fieldValue || '').includes(String(ruleValue)); break;
        case 'not_contains': isVisible = !String(fieldValue || '').includes(String(ruleValue)); break;
        case 'greater_than': isVisible = Number(fieldValue) > Number(ruleValue); break;
        case 'less_than': isVisible = Number(fieldValue) < Number(ruleValue); break;
      }
      if (!isVisible) return '';
    }

    let blockHtml = '';
    switch (block.type) {
      case 'heading': {
        const level = block.content?.level || 'h1';
        const size = block.styles?.fontSize || (level === 'h1' ? 32 : level === 'h2' ? 24 : 20);
        const color = block.styles?.color || '#111827';
        const family = block.styles?.fontFamily || baseFont;
        blockHtml = `<${level} style="font-size: ${size}px; font-weight: bold; margin-bottom: 16px; color: ${color}; font-family: ${family};">${replaceVars(block.content?.text)}</${level}>`;
        break;
      }
      case 'text': {
        const textContent = replaceVars(block.content?.text);
        if (!textContent.trim()) return ''; // don't render empty text blocks (e.g. if GST is empty)
        const size = block.styles?.fontSize || baseSize;
        const color = block.styles?.color || '#374151';
        const family = block.styles?.fontFamily || baseFont;
        blockHtml = `<div style="font-size: ${size}px; line-height: 1.6; margin-bottom: 16px; color: ${color}; font-family: ${family}; white-space: pre-wrap;">${textContent}</div>`;
        break;
      }
      case 'line':
      case 'divider': {
        if (block.content?.isPageBreak === true) {
          blockHtml = `<div style="page-break-before: always; break-before: page; height: 0; margin: 24px 0; border-top: 1px dashed #94A3B8;"></div>`;
          break;
        }
        const width = block.styles?.borderWidth || 2;
        const style = block.styles?.borderStyle || 'solid';
        const color = block.styles?.borderColor || '#CBD5E1';
        const orientation = block.styles?.orientation || 'horizontal';
        if (orientation === 'vertical') {
          const height = block.styles?.height || '64px';
          blockHtml = `<div style="height: ${height}; border-left: ${width}px ${style} ${color}; margin: 12px auto; display: inline-block;"></div>`;
        } else {
          blockHtml = `<hr style="border: none; border-top: ${width}px ${style} ${color}; margin: 24px 0;" />`;
        }
        break;
      }
      case 'box': {
        const bg = block.styles?.backgroundColor || '#F8FAFC';
        const border = block.styles?.borderColor || '#E2E8F0';
        const borderStyle = block.styles?.borderStyle || 'solid';
        const borderWidth = block.styles?.borderWidth !== undefined ? block.styles.borderWidth : 1;
        const radius = block.styles?.borderRadius ?? 12;
        const padding = block.styles?.padding ? `${block.styles.padding}` : '20px';
        const shadow = block.styles?.boxShadow || '0 1px 3px 0 rgba(0, 0, 0, 0.05)';
        const color = block.styles?.color || '#1E293B';
        blockHtml = `<div style="background-color: ${bg}; border: ${borderWidth}px ${borderStyle} ${border}; padding: ${padding}; border-radius: ${radius}px; box-shadow: ${shadow}; margin-bottom: 16px; font-family: ${baseFont}; color: ${color}; white-space: pre-wrap;">${replaceVars(block.content?.text)}</div>`;
        break;
      }
      case 'container': {
        const direction = block.content?.direction || 'row';
        const justify = block.content?.justifyContent || 'space-between';
        const align = block.content?.alignItems || 'center';
        const gap = block.content?.gap !== undefined ? Number(block.content.gap) : 24;
        const wrap = block.content?.wrap !== false ? 'wrap' : 'nowrap';
        const bg = block.styles?.backgroundColor || 'transparent';
        const border = block.styles?.borderColor || 'transparent';
        const borderStyle = block.styles?.borderStyle || 'none';
        const borderWidth = block.styles?.borderWidth !== undefined ? block.styles.borderWidth : 0;
        const radius = block.styles?.borderRadius ?? 0;
        const padding = block.styles?.padding ? `${block.styles.padding}` : '0px';
        const shadow = block.styles?.boxShadow || 'none';

        const children = block.content?.children || [];
        const childrenHtml = children.map((child: any) => {
          let childInnerHtml = '';
          if (child.type === 'signature') {
            childInnerHtml = `
              <div style="width: 100%; max-width: 280px; font-family: ${baseFont};">
                <div style="border-bottom: 1px dashed #9CA3AF; height: 60px; display: flex; align-items: flex-end; justify-content: center;">
                  ${child.content?.signatureImage ? `<img src="${child.content.signatureImage}" style="max-height: 56px; max-width: 100%; object-fit: contain;" />` : ''}
                </div>
                <p style="text-align: center; font-weight: 600; font-size: 13px; color: #374151; margin-top: 8px;">${replaceVars(child.content?.label) || 'Authorized Signatory'}</p>
                ${child.content?.requireName !== false ? `
                  <div style="margin-top: 16px;">
                    <div style="border-bottom: 1px solid #D1D5DB; height: 26px; display: flex; align-items: flex-end; padding-bottom: 4px;">
                      <span style="font-size: 11px; font-weight: 500; color: #9CA3AF;">Name: ________________</span>
                    </div>
                  </div>
                ` : ''}
              </div>
            `;
          } else if (child.type === 'text') {
            const size = child.styles?.fontSize || baseSize;
            const color = child.styles?.color || '#374151';
            childInnerHtml = `<div style="font-size: ${size}px; line-height: 1.6; color: ${color}; font-family: ${baseFont}; white-space: pre-wrap;">${replaceVars(child.content?.text || '')}</div>`;
          } else if (child.type === 'image') {
            const url = replaceVars(child.content?.url);
            if (url) childInnerHtml = `<img src="${url}" alt="Container Image" style="max-width: 100%; height: auto; border-radius: 4px;" />`;
          } else if (child.type === 'box') {
            const childBg = child.styles?.backgroundColor || '#F8FAFC';
            const childBorder = child.styles?.borderColor || '#E2E8F0';
            const childRadius = child.styles?.borderRadius ?? 8;
            const childPadding = child.styles?.padding ? `${child.styles.padding}` : '12px';
            childInnerHtml = `<div style="background-color: ${childBg}; border: 1px solid ${childBorder}; border-radius: ${childRadius}px; padding: ${childPadding}; font-family: ${baseFont};">${replaceVars(child.content?.text || '')}</div>`;
          } else {
            childInnerHtml = `<div style="font-family: ${baseFont};">${replaceVars(child.content?.text || '')}</div>`;
          }

          const childWidth = child.width || (direction === 'row' ? '48%' : '100%');
          const childFlex = child.flex || (direction === 'row' ? '1 1 0px' : 'none');

          return `<div style="flex: ${childFlex}; min-width: 220px; ${child.width ? `width: ${childWidth};` : ''}">${childInnerHtml}</div>`;
        }).join('');

        blockHtml = `<div style="display: flex; flex-direction: ${direction}; justify-content: ${justify}; align-items: ${align}; gap: ${gap}px; flex-wrap: ${wrap}; background-color: ${bg}; border: ${borderWidth}px ${borderStyle} ${border}; border-radius: ${radius}px; padding: ${padding}; box-shadow: ${shadow}; margin-bottom: 24px; width: 100%;">
          ${childrenHtml}
        </div>`;
        break;
      }
      case 'image': {
        const url = replaceVars(block.content?.url);
        if (!url || url.trim() === '') return ''; // don't render image if url is empty
        const width = block.styles?.width || '100%';
        blockHtml = `<img src="${url}" alt="Document Image" style="width: ${width}; height: auto; max-width: 100%; border-radius: 4px;" />`;
        break;
      }
      case 'list': {
        const items = (block.content?.items as string[]) || [];
        const isNumber = block.styles?.listType === 'number';
        const size = block.styles?.fontSize || baseSize;
        const color = block.styles?.color || '#374151';
        const family = block.styles?.fontFamily || baseFont;
        const itemsHtml = items.map(item => `<li style="margin-bottom: 4px;">${replaceVars(item)}</li>`).join('');
        blockHtml = `<${isNumber ? 'ol' : 'ul'} style="font-size: ${size}px; line-height: 1.6; color: ${color}; font-family: ${family}; margin-bottom: 16px; padding-left: 24px; list-style-type: ${isNumber ? 'decimal' : 'disc'};">${itemsHtml}</${isNumber ? 'ol' : 'ul'}>`;
        break;
      }
      case 'pricing_table':
      case 'grid': {
        if (block.content?.items && Array.isArray(block.content.items)) {
          const items = block.content.items;
          const currency = block.content?.currency || documentDetails?.currency || 'INR';
          const currencySymbol = currency === 'USD' ? '$' : '₹';
          const subtotal = items.reduce((acc: number, it: any) => acc + (Number(it.quantity || 1) * Number(it.rate || 0)), 0);
          const discountPercent = Number(block.content?.discountPercent || 0);
          const discountAmount = (subtotal * discountPercent) / 100;
          const taxableSubtotal = subtotal - discountAmount;
          const taxAmount = items.reduce((acc: number, it: any) => {
            const itemTotal = Number(it.quantity || 1) * Number(it.rate || 0);
            return acc + (itemTotal * Number(it.taxRate || 0)) / 100;
          }, 0);
          const grandTotal = taxableSubtotal + taxAmount;

          const rowsHtml = items.map((it: any, idx: number) => {
            const lineTotal = Number(it.quantity || 1) * Number(it.rate || 0);
            return `<tr style="border-bottom: 1px solid #F1F5F9;">
              <td style="padding: 10px 14px; font-weight: 500; color: #1E293B;">${replaceVars(it.description || '')}</td>
              <td style="padding: 10px 10px; text-align: center; color: #475569;">${it.quantity || 1}</td>
              <td style="padding: 10px 10px; text-align: right; color: #475569;">${currencySymbol}${Number(it.rate || 0).toLocaleString()}</td>
              <td style="padding: 10px 10px; text-align: center; color: #64748B;">${it.taxRate || 0}%</td>
              <td style="padding: 10px 14px; text-align: right; font-weight: 700; color: #0F172A;">${currencySymbol}${lineTotal.toLocaleString()}</td>
            </tr>`;
          }).join('');

          blockHtml = `<div style="margin: 24px 0; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; font-family: ${baseFont};">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: ${baseSize - 2}px;">
              <thead>
                <tr style="background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0; color: #475569; font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                  <th style="padding: 12px 14px; width: 45%;">Item / Description</th>
                  <th style="padding: 12px 10px; width: 12%; text-align: center;">Qty</th>
                  <th style="padding: 12px 10px; width: 18%; text-align: right;">Rate</th>
                  <th style="padding: 12px 10px; width: 10%; text-align: center;">Tax</th>
                  <th style="padding: 12px 14px; width: 15%; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <div style="background-color: #F8FAFC; padding: 14px 18px; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end;">
              <div style="width: 240px; font-size: ${baseSize - 2}px; line-height: 1.8;">
                <div style="display: flex; justify-content: space-between; color: #64748B;"><span>Subtotal:</span><span style="font-weight: 600; color: #1E293B;">${currencySymbol}${subtotal.toLocaleString()}</span></div>
                ${discountAmount > 0 ? `<div style="display: flex; justify-content: space-between; color: #10B981;"><span>Discount (${discountPercent}%):</span><span style="font-weight: 600;">-${currencySymbol}${discountAmount.toLocaleString()}</span></div>` : ''}
                <div style="display: flex; justify-content: space-between; color: #64748B;"><span>Tax:</span><span style="font-weight: 600; color: #1E293B;">+${currencySymbol}${taxAmount.toLocaleString()}</span></div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: ${baseSize}px; color: #0F172A; border-top: 1px solid #CBD5E1; padding-top: 6px; margin-top: 4px;"><span>Grand Total:</span><span style="color: #2563EB;">${currencySymbol}${grandTotal.toLocaleString()}</span></div>
              </div>
            </div>
          </div>`;
          break;
        }

        const data = (block.content?.data as string[][]) || [];
        const showTotals = block.content?.showTotals || false;
        const colWidths = block.content?.colWidths as number[] | undefined;
        const isCurrency = block.content?.isCurrency || false;
        const hideBorders = block.content?.hideBorders || false;
        const borderStyle = hideBorders ? 'none' : '1px solid #E5E7EB';
        const bgStyle = hideBorders ? 'background-color: transparent;' : 'background-color: #FFFFFF;';
        const size = block.styles?.fontSize || (baseSize - 2);
        const color = block.styles?.color || '#1F2937';
        const family = block.styles?.fontFamily || baseFont;

        const formatNumber = (num: number) => {
          if (isCurrency) {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
          }
          return num.toFixed(2);
        };

        const calculateColumnSum = (colIndex: number) => {
          let sum = 0;
          let hasNumbers = false;
          for (let r = 1; r < data.length; r++) {
            const val = parseFloat((data[r][colIndex] || '').replace(/[^0-9.-]+/g, ''));
            if (!isNaN(val)) {
              sum += val;
              hasNumbers = true;
            }
          }
          return hasNumbers ? formatNumber(sum) : null;
        };

        const rowsHtml = data.map((row, rowIndex) => {
          const isHeader = rowIndex === 0;
          const cellsHtml = row.map((cell, colIndex) => {
              const widthStyle = colWidths && colWidths[colIndex] ? `width: ${colWidths[colIndex]}px;` : '';
              return `<td style="border: ${isHeader && !hideBorders ? '1px solid #E5E7EB' : borderStyle}; padding: 12px; white-space: pre-wrap; ${widthStyle} ${isHeader && !hideBorders ? 'background-color: #F9FAFB; font-weight: bold;' : bgStyle}">${replaceVars(cell)}</td>`;
          }).join('');
          return `<tr>${cellsHtml}</tr>`;
        }).join('');

        let totalsHtml = '';
        if (showTotals && data.length > 0) {
          const cellsHtml = data[0].map((_, colIndex) => {
            const sum = calculateColumnSum(colIndex);
            const content = colIndex === 0 && !sum ? 'Total:' : sum !== null ? sum : '';
            return `<td style="border: 1px solid #E5E7EB; padding: 12px; background-color: #F3F4F6; font-weight: bold; text-align: right;">${content}</td>`;
          }).join('');
          totalsHtml = `<tfoot><tr>${cellsHtml}</tr></tfoot>`;
        }

        blockHtml = `<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-family: ${family}; font-size: ${size}px; color: ${color}; text-align: left; table-layout: fixed; word-wrap: break-word;">
          <tbody>${rowsHtml}</tbody>
          ${totalsHtml}
        </table>`;
        break;
      }
      case 'signature': {
        const label = replaceVars(block.content?.label) || 'Authorized Signatory';
        const requireName = block.content?.requireName !== false;
        const signatoryName = replaceVars(block.content?.signatoryName) || '';
        const sigImg = block.content?.signatureImage;
        const width = block.content?.width || block.styles?.width || '280px';
        const maxWidth = width === '100%' ? '100%' : width;

        blockHtml = `
          <div style="width: 100%; max-width: ${maxWidth}; font-family: ${baseFont}; margin-top: 16px; margin-bottom: 16px;">
            <div style="border-bottom: 1.5px dashed #9CA3AF; height: 64px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 4px; background-color: #F9FAFB; border-radius: 6px 6px 0 0;">
              ${sigImg ? `<img src="${sigImg}" style="max-height: 56px; max-width: 100%; object-fit: contain;" />` : `<span style="font-size: 11px; color: #9CA3AF; font-style: italic;">[ Signature Slot ]</span>`}
            </div>
            <p style="text-align: left; font-weight: 700; font-size: 12px; color: #374151; margin-top: 6px; margin-bottom: 2px;">${label}</p>
            ${requireName ? `
              <div style="font-size: 11px; color: #4B5563; margin-top: 4px; border-bottom: 1px solid #E5E7EB; padding-bottom: 2px;">
                <span style="color: #9CA3AF; font-weight: 500;">Name:</span> ${signatoryName ? `<span style="font-weight: 600;">${signatoryName}</span>` : '______________________'}
              </div>
            ` : ''}
          </div>
        `;
        break;
      }
      case 'approval_buttons':
      case 'decision': {
        const d = block.content?.decision;
        if (d) {
          const isApproved = d.status === 'approved';
          const bg = isApproved ? '#ECFDF5' : '#FFF1F2';
          const border = isApproved ? '#A7F3D0' : '#FECDD3';
          const textCol = isApproved ? '#065F46' : '#9F1239';
          blockHtml = `<div style="margin: 24px 0; padding: 18px 20px; background-color: ${bg}; border: 1px solid ${border}; border-radius: 12px; font-family: ${baseFont};">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-weight: bold; font-size: 13px; color: ${textCol};">${isApproved ? '✅ APPROVED & ACCEPTED' : '❌ DECLINED / CHANGES REQUESTED'} (${d.reviewerRole || 'Reviewer'})</span>
              <span style="font-size: 11px; color: #64748B;">${new Date(d.timestamp || Date.now()).toLocaleDateString()}</span>
            </div>
            <p style="font-size: 12px; color: #334155; margin-top: 6px;">Reviewed by <b>${d.reviewerName || 'Reviewer'}</b></p>
            ${d.reason ? `<div style="margin-top: 8px; padding: 10px; background-color: #FFFFFF; border: 1px solid #FFE4E6; border-radius: 8px; font-size: 12px; color: #881337;"><b>Reason:</b> "${d.reason}"</div>` : ''}
            ${d.note ? `<div style="margin-top: 8px; padding: 10px; background-color: #FFFFFF; border: 1px solid #D1FAE5; border-radius: 8px; font-size: 12px; color: #065F46;"><b>Note:</b> "${d.note}"</div>` : ''}
          </div>`;
        } else {
          blockHtml = `<div style="margin: 24px 0; padding: 20px; background-color: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 12px; text-align: center; font-family: ${baseFont};">
            <p style="font-weight: bold; font-size: 13px; color: #334155; margin-bottom: 4px;">${block.content?.title || 'Document Approval & Sign-Off'}</p>
            <p style="font-size: 11px; color: #64748B;">[ Accept & Approve ] &nbsp;&nbsp; [ Decline / Request Changes ]</p>
          </div>`;
        }
        break;
      }
      case 'payment_checkout':
      case 'payment':
      case 'checkout': {
        const mode = block.content?.mode || 'button';
        if (mode === 'button') {
          const btnText = replaceVars(block.content?.buttonText || 'Pay via Secure Gateway');
          const pUrl = block.content?.paymentUrl || '#';
          const btnColor = block.content?.buttonColor || '#4f46e5';
          const amount = block.content?.amountText ? `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; font-size: 12px; background: rgba(255,255,255,0.25); border-radius: 12px;">${block.content.amountText}</span>` : '';
          const align = block.content?.buttonAlignment || 'center';
          const alignStyle = align === 'left' ? 'text-align: left;' : align === 'right' ? 'text-align: right;' : 'text-align: center;';
          
          blockHtml = `
            <div style="margin: 24px 0; ${alignStyle} font-family: ${baseFont};">
              <a href="${pUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 28px; background-color: ${btnColor}; color: #FFFFFF; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
                💳 ${btnText} ${amount}
              </a>
            </div>
          `;
        } else if (mode === 'milestones') {
          const mTitle = replaceVars(block.content?.milestoneTitle || 'Project Payment Milestones');
          const mCurrency = block.content?.milestoneCurrency || 'INR';
          const sym = mCurrency === 'USD' ? '$' : mCurrency === 'EUR' ? '€' : '₹';
          const milestones = block.content?.milestones || [];
          
          const rows = milestones.map((m: any, idx: number) => `
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 10px 14px; font-weight: 600; color: #1E293B;">${idx + 1}. ${replaceVars(m.title)}</td>
              <td style="padding: 10px 14px; text-align: center; font-weight: bold; color: #4F46E5;">${m.percentage}%</td>
              <td style="padding: 10px 14px; text-align: right; font-weight: bold; color: #0F172A;">${sym}${(Number(m.amount) || 0).toLocaleString()}</td>
              <td style="padding: 10px 14px; color: #64748B;">${replaceVars(m.dueDate) || 'Upon milestone'}</td>
              <td style="padding: 10px 14px; text-align: center;"><span style="padding: 2px 8px; font-size: 10px; font-weight: bold; background: #F1F5F9; color: #475569; border-radius: 12px; text-transform: uppercase;">${m.status || 'pending'}</span></td>
            </tr>
          `).join('');

          blockHtml = `
            <div style="margin: 24px 0; border: 1px solid #CBD5E1; border-radius: 10px; overflow: hidden; font-family: ${baseFont};">
              <div style="background-color: #F8FAFC; padding: 12px 16px; border-bottom: 1px solid #E2E8F0; font-weight: bold; font-size: 13px; color: #0F172A;">
                📅 ${mTitle}
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                <thead>
                  <tr style="background-color: #F1F5F9; font-size: 11px; text-transform: uppercase; color: #64748B;">
                    <th style="padding: 8px 14px;">Phase & Deliverables</th>
                    <th style="padding: 8px 14px; text-align: center;">% Share</th>
                    <th style="padding: 8px 14px; text-align: right;">Amount</th>
                    <th style="padding: 8px 14px;">Due Date</th>
                    <th style="padding: 8px 14px; text-align: center;">Status</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          `;
        } else if (mode === 'upi_transfer' || mode === 'upi') {
          const uTitle = replaceVars(block.content?.upiDetailsTitle || 'Instant UPI & QR Transfer');
          const accHolder = replaceVars(block.content?.accountHolderName || 'Acme Technologies Pvt Ltd');
          const upi = block.content?.upiId || 'company@okhdfcbank';
          const bName = replaceVars(block.content?.bankName || 'HDFC Bank UPI');
          const instructions = replaceVars(block.content?.additionalInstructions || 'Scan with any UPI app (GPay, PhonePe, Paytm) or copy UPI ID to transfer.');

          blockHtml = `
            <div style="margin: 24px 0; padding: 18px 20px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; font-family: ${baseFont}; font-size: 12px; color: #1E293B;">
              <div style="display: flex; align-items: center; justify-content: space-between; font-weight: bold; font-size: 14px; margin-bottom: 12px; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;">
                <span style="color: #0F172A;">⚡ ${uTitle}</span>
                <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; background-color: #ECFDF5; color: #047857; padding: 2px 8px; border-radius: 12px; border: 1px solid #A7F3D0;">Instant UPI</span>
              </div>
              <div style="margin-bottom: 12px; padding: 12px; background-color: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px;">
                <span style="color: #166534; font-size: 10px; text-transform: uppercase; font-weight: bold;">UPI ID / VPA Handle:</span><br/>
                <b style="font-family: monospace; font-size: 14px; color: #047857; letter-spacing: 0.5px;">${upi}</b>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <div style="background-color: #F8FAFC; padding: 10px; border-radius: 8px; border: 1px solid #F1F5F9;"><span style="color: #64748B; font-size: 10px; text-transform: uppercase;">Beneficiary:</span><br/><b style="color: #0F172A;">${accHolder}</b></div>
                <div style="background-color: #F8FAFC; padding: 10px; border-radius: 8px; border: 1px solid #F1F5F9;"><span style="color: #64748B; font-size: 10px; text-transform: uppercase;">Provider / Bank:</span><br/><b style="color: #0F172A;">${bName}</b></div>
              </div>
              <div style="font-size: 11px; color: #64748B; padding: 8px 12px; background-color: #F8FAFC; border-radius: 6px; border: 1px solid #F1F5F9;">
                <b>Note:</b> ${instructions}
              </div>
            </div>
          `;
        } else {
          const bTitle = replaceVars(block.content?.bankDetailsTitle || 'Direct Bank & Wire Transfer Details');
          const accHolder = replaceVars(block.content?.accountHolderName || 'Acme Technologies Pvt Ltd');
          const bName = replaceVars(block.content?.bankName || 'HDFC Bank');
          const accNum = block.content?.accountNumber || '';
          const ifsc = block.content?.ifscOrSwiftCode || '';
          const iban = block.content?.iban || '';
          const instructions = replaceVars(block.content?.additionalInstructions || 'Please include your invoice reference number in the wire transfer remarks.');

          blockHtml = `
            <div style="margin: 24px 0; padding: 18px 20px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; font-family: ${baseFont}; font-size: 12px; color: #1E293B;">
              <div style="display: flex; align-items: center; justify-content: space-between; font-weight: bold; font-size: 14px; margin-bottom: 12px; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;">
                <span style="color: #0F172A;">🏦 ${bTitle}</span>
                <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; background-color: #EEF2FF; color: #4338CA; padding: 2px 8px; border-radius: 12px; border: 1px solid #C7D2FE;">Verified Bank Wire</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                <div style="background-color: #F8FAFC; padding: 10px; border-radius: 8px; border: 1px solid #F1F5F9;"><span style="color: #64748B; font-size: 10px; text-transform: uppercase;">Account Number:</span><br/><b style="font-family: monospace; font-size: 13px; color: #0F172A; letter-spacing: 1px;">${accNum}</b></div>
                <div style="background-color: #F8FAFC; padding: 10px; border-radius: 8px; border: 1px solid #F1F5F9;"><span style="color: #64748B; font-size: 10px; text-transform: uppercase;">IFSC / SWIFT:</span><br/><b style="font-family: monospace; font-size: 13px; color: #4338CA; letter-spacing: 1px;">${ifsc}</b></div>
                <div style="background-color: #F8FAFC; padding: 10px; border-radius: 8px; border: 1px solid #F1F5F9;"><span style="color: #64748B; font-size: 10px; text-transform: uppercase;">Bank & Beneficiary:</span><br/><b style="color: #0F172A;">${bName} &bull; ${accHolder}</b></div>
                <div style="background-color: #F8FAFC; padding: 10px; border-radius: 8px; border: 1px solid #F1F5F9;"><span style="color: #64748B; font-size: 10px; text-transform: uppercase;">IBAN (Wire):</span><br/><b style="font-family: monospace; font-size: 12px; color: #475569;">${iban || 'N/A'}</b></div>
              </div>
              <div style="font-size: 11px; color: #64748B; padding: 8px 12px; background-color: #F8FAFC; border-radius: 6px; border: 1px solid #F1F5F9;">
                <b>Note:</b> ${instructions}
              </div>
            </div>
          `;
        }
        break;
      }
      case 'input': {
        const label = block.content?.label || 'Input Field';
        const required = block.content?.required ? ' *' : '';
        const placeholder = block.content?.placeholder || '';
        const inputType = block.content?.inputType || 'text';
        
        let inputHtml;
        if (inputType === 'textarea') {
            inputHtml = `<div style="border: 1px solid #D1D5DB; border-radius: 6px; padding: 12px; min-height: 80px; background: #F9FAFB; color: #9CA3AF; font-size: ${baseSize}px;">${placeholder}</div>`;
        } else if (inputType === 'checkbox') {
            inputHtml = `<div style="width: 16px; height: 16px; border: 1px solid #D1D5DB; border-radius: 4px; background: #F9FAFB; display: inline-block; vertical-align: middle;"></div>`;
        } else {
            inputHtml = `<div style="border: 1px solid #D1D5DB; border-radius: 6px; padding: 8px 12px; background: #F9FAFB; color: #9CA3AF; font-size: ${baseSize}px;">${placeholder}</div>`;
        }

        blockHtml = `<div style="margin-bottom: 16px; font-family: ${baseFont};">
          <label style="display: block; font-size: ${baseSize}px; font-weight: 600; color: #374151; margin-bottom: 8px;">${label}${required}</label>
          ${inputHtml}
        </div>`;
        break;
      }
      case 'pagebreak': {
        blockHtml = `<div style="page-break-before: always; height: 0; margin: 0; padding: 0;"></div>`;
        break;
      }
    }
    
    if (!blockHtml) return '';
    
    const align = block.styles?.alignment || 'left';
    let alignmentStyle = 'margin-right: auto;';
    if (align === 'center') alignmentStyle = 'margin: 0 auto;';
    if (align === 'right') alignmentStyle = 'margin-left: auto;';
    
    const width = block.styles?.width || '100%';
    
    return `<div style="${alignmentStyle} width: ${width};">${blockHtml}</div>`;
  }).join('\n');

  if (fragmentOnly) return blocksHtml;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: ${baseFont}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 40px; box-sizing: border-box; }
          * { box-sizing: border-box; }
        </style>
      </head>
      <body>
        <div style="max-width: 800px; margin: 0 auto; color: ${primaryColor};">
          ${blocksHtml}
        </div>
      </body>
    </html>
  `;
}
