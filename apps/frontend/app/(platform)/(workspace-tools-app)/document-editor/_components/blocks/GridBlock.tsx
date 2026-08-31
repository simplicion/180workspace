import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateBlock, Block } from '@/redux/slices/documentSlice';
import { Plus, Trash2 } from 'lucide-react';
import { autoLinkUrls } from '../utils/autoLinkUrls';

interface GridBlockProps {
  block: Block;
  isSelected: boolean;
}

export function GridBlock({ block, isSelected }: GridBlockProps) {
  const dispatch = useDispatch();
  const documentDetails = useSelector((state: any) => state.document?.documentDetails || {});

  // Initialize data if not present
  const data: string[][] = block.content?.data || [
    ['Header 1', 'Header 2'],
    ['Row 1, Cell 1', 'Row 1, Cell 2'],
  ];
  const showTotals = block.content?.showTotals || false;
  const isCurrency = block.content?.isCurrency || false;
  const hideBorders = block.content?.hideBorders || false;

  const renderCellContent = (rawCell: string) => {
    if (!rawCell) return '\u00A0';
    let content = rawCell;

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
      ...(documentDetails || {})
    };

    Object.keys(mergedVars).forEach(key => {
      const val = mergedVars[key] || fallbackPlaceholders[key] || '';
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      content = content.replace(regex, val);
    });

    content = content.replace(/{{\\s*[a-zA-Z0-9_]+\\s*}}/g, '');

    const linkedHtml = autoLinkUrls(content);
    return <div dangerouslySetInnerHTML={{ __html: linkedHtml }} className="[&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-700" />;
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newData = data.map((row, r) => 
      r === rowIndex ? row.map((cell, c) => c === colIndex ? value : cell) : row
    );
    
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, data: newData }
      }
    }));
  };

  const addRow = () => {
    const newRow = Array(data[0].length).fill('');
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, data: [...data, newRow] }
      }
    }));
  };

  const removeRow = (index: number) => {
    if (data.length <= 1) return;
    const newData = data.filter((_, i) => i !== index);
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, data: newData }
      }
    }));
  };


  const [colWidths, setColWidths] = React.useState<number[]>(block.content?.colWidths || data[0].map(() => 150));
  const tableRef = React.useRef<HTMLTableElement>(null);
  const resizingCol = React.useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, colIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    resizingCol.current = {
      index: colIndex,
      startX: e.clientX,
      startWidth: colWidths[colIndex] || 150
    };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingCol.current) return;
      const diff = moveEvent.clientX - resizingCol.current.startX;
      const newWidth = Math.max(50, resizingCol.current.startWidth + diff);
      
      setColWidths(prev => {
        const next = [...prev];
        next[resizingCol.current!.index] = newWidth;
        return next;
      });
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Save to redux when done
      setColWidths(finalWidths => {
        dispatch(updateBlock({
          id: block.id,
          updates: {
            content: { ...block.content, colWidths: finalWidths }
          }
        }));
        return finalWidths;
      });
      resizingCol.current = null;
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleTotals = () => {
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, showTotals: !showTotals }
      }
    }));
  };

  const toggleCurrency = () => {
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, isCurrency: !isCurrency }
      }
    }));
  };

  const formatNumber = (num: number) => {
    if (isCurrency) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    }
    return num.toFixed(2);
  };

  const calculateColumnSum = (colIndex: number) => {
    let sum = 0;
    let hasNumbers = false;
    for (let r = 1; r < data.length; r++) { // Skip header
      const val = parseFloat((data[r][colIndex] || '').replace(/[^0-9.-]+/g, ''));
      if (!isNaN(val)) {
        sum += val;
        hasNumbers = true;
      }
    }
    return hasNumbers ? formatNumber(sum) : null;
  };

  const addCol = () => {
    const newData = data.map(row => [...row, '']);
    const newWidths = [...colWidths, 150];
    setColWidths(newWidths);
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, data: newData, colWidths: newWidths }
      }
    }));
  };

  const removeCol = (colIndex: number) => {
    if (data[0].length <= 1) return;
    const newData = data.map(row => row.filter((_, c) => c !== colIndex));
    const newWidths = colWidths.filter((_, c) => c !== colIndex);
    setColWidths(newWidths);
    dispatch(updateBlock({
      id: block.id,
      updates: {
        content: { ...block.content, data: newData, colWidths: newWidths }
      }
    }));
  };

  const customStyles: React.CSSProperties = {
    fontSize: block.styles?.fontSize ? `${block.styles.fontSize}px` : undefined,
    color: block.styles?.color as string || undefined,
    fontFamily: block.styles?.fontFamily as string || undefined,
  };

  return (
    <div className="w-full relative overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" style={customStyles}>
      <table ref={tableRef} className={`w-full border-collapse ${hideBorders ? 'border-transparent' : 'border border-gray-200'}`} style={{ tableLayout: 'fixed' }}>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="group/row">
              {row.map((cell, colIndex) => (
                <td 
                  key={colIndex} 
                  style={{ width: colWidths[colIndex] || 150 }}
                  className={`${hideBorders ? 'border-transparent' : 'border border-gray-200'} p-0 relative ${rowIndex === 0 && !hideBorders ? 'bg-gray-50 font-semibold' : 'bg-transparent'}`}
                >
                  {isSelected ? (
                    <textarea
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className="w-full h-full p-2 bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500 resize-none min-h-[40px] overflow-hidden"
                      rows={1}
                    />
                  ) : (
                    <div className="p-2 min-h-[40px] break-words">
                      {renderCellContent(cell)}
                    </div>
                  )}

                  {/* Column Resizer */}
                  {rowIndex === 0 && (
                    <div 
                      onMouseDown={(e) => handleMouseDown(e, colIndex)}
                      className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-400 z-10 transition-colors"
                    />
                  )}

                  {/* Delete Column Button (only show on header row when selected) */}
                  {isSelected && rowIndex === 0 && data[0].length > 1 && (
                    <button 
                      onClick={() => removeCol(colIndex)}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 hover:bg-red-200 z-20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </td>
              ))}
              
              {/* Delete Row Button */}
              {isSelected && data.length > 1 && (
                <td className="w-0 p-0 border-none relative align-middle" style={{ width: 0 }}>
                  <button 
                    onClick={() => removeRow(rowIndex)}
                    className="absolute -right-6 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 hover:bg-red-200 z-20"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {showTotals && (
          <tfoot>
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
              {data[0].map((_, colIndex) => {
                const sum = calculateColumnSum(colIndex);
                return (
                  <td key={colIndex} className="border border-gray-200 p-2 min-w-[100px] text-right">
                    {colIndex === 0 && !sum ? 'Total:' : sum !== null ? sum : ''}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
