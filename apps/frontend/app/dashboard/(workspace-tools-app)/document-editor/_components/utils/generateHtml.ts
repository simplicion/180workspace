import { Block } from '../../../../../../redux/slices/documentSlice';
import { HEADER_TEMPLATES, FOOTER_TEMPLATES } from '../../../_components/headerFooterTemplates';

export function generateHtmlFromBlocks(blocks: Block[], documentDetails: any, designSettings: any, brandConfig?: any, fragmentOnly: boolean = false): string {
  const baseFont = designSettings?.fontFamily || 'sans-serif';
  const baseSize = designSettings?.fontSize || 16;
  const primaryColor = designSettings?.primaryColor || '#2563eb';

  const replaceVars = (text: string) => {
    if (!text) return '';
    let replaced = text;
    
    // Replace primaryColor directly
    replaced = replaced.replace(/{{\\s*primaryColor\\s*}}/g, primaryColor);

    if (documentDetails) {
      Object.keys(documentDetails).forEach(key => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        replaced = replaced.replace(regex, documentDetails[key] || '');
      });
    }

    if (brandConfig) {
      Object.keys(brandConfig).forEach(key => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        const val = brandConfig[key];
        // Only replace with string/number (skip if it's an object/undefined)
        if (typeof val === 'string' || typeof val === 'number') {
          replaced = replaced.replace(regex, String(val));
        } else if (!val) {
           replaced = replaced.replace(regex, ''); // remove placeholders if no value
        }
      });
    }
    
    // Clean up any remaining unreplaced company variables
    replaced = replaced.replace(/{{\\s*company[A-Za-z0-9_]+\\s*}}/g, '');
    replaced = replaced.replace(/{{\\s*authorizedSignatory\\s*}}/g, '');
    
    return replaced;
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
      case 'divider': {
        const width = block.styles?.borderWidth || 2;
        const style = block.styles?.borderStyle || 'solid';
        const color = block.styles?.borderColor || '#D1D5DB';
        blockHtml = `<hr style="border: none; border-top: ${width}px ${style} ${color}; margin: 24px 0;" />`;
        break;
      }
      case 'box': {
        const bg = block.styles?.backgroundColor || '#F9FAFB';
        const border = block.styles?.borderColor || '#E5E7EB';
        const radius = block.styles?.borderRadius ?? 8;
        blockHtml = `<div style="background-color: ${bg}; border: 1px solid ${border}; padding: 24px; border-radius: ${radius}px; margin-bottom: 16px; font-family: ${baseFont}; color: #1F2937; white-space: pre-wrap;">${replaceVars(block.content?.text)}</div>`;
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
      case 'grid': {
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
      case 'signature':
        blockHtml = `
          <div style="margin-top: 48px; width: 250px; font-family: ${baseFont};">
            <div style="border-bottom: 1px dashed #9CA3AF; height: 60px; display: flex; align-items: flex-end; justify-content: center;">
              ${block.content?.signatureImage ? `<img src="${block.content.signatureImage}" style="max-height: 56px; max-width: 100%; object-fit: contain;" />` : ''}
            </div>
            <p style="text-align: center; font-weight: 600; font-size: 14px; color: #374151; margin-top: 8px;">${replaceVars(block.content?.label) || 'Signature'}</p>
            ${block.content?.requireName ? `
              <div style="margin-top: 24px;">
                <div style="border-bottom: 1px solid #D1D5DB; height: 32px; display: flex; align-items: flex-end; padding-bottom: 4px;">
                  <span style="font-size: 12px; font-weight: 500; color: #9CA3AF;">Name:</span>
                </div>
              </div>
            ` : ''}
          </div>
        `;
        break;
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
