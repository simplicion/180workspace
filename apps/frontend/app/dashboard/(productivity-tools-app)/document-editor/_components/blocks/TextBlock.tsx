import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateBlock, Block } from '../../../../../../redux/slices/documentSlice';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface TextBlockProps {
  block: Block;
  isSelected: boolean;
}

export function TextBlock({ block, isSelected }: TextBlockProps) {
  const dispatch = useDispatch();
  const documentDetails = useSelector((state: any) => state.document?.documentDetails);

  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: block.content?.text || '',
    onUpdate: ({ editor }) => {
      dispatch(updateBlock({
        id: block.id,
        updates: {
          content: { ...block.content, text: editor.getHTML() }
        }
      }));
    },
    editable: isSelected,
  });

  // Ensure editor editable state syncs with isSelected
  useEffect(() => {
    if (editor) {
      editor.setEditable(isSelected);
      if (isSelected) {
        editor.commands.focus('end');
      }
    }
  }, [editor, isSelected]);

  // Replace variables in text (only for viewing mode logic, though tiptap handles rendering differently, we might need a custom extension or just replace it on render if we disable tiptap for viewing, but it's easier to just use tiptap for rendering too. Wait, variables should be replaced dynamically. For now, let's just let tiptap render the raw variables if we're not touching custom node views. 
  // Actually, for a WYSIWYG editor, we want variables to remain as {{var}} in the source, but maybe render as badges? 
  // For simplicity, let's just use tiptap for editing, and a dangerouslySetInnerHTML div for viewing where variables are replaced!

  const getRenderedHtml = () => {
    let html = block.content?.text || '<p>Enter text...</p>';
    if (!documentDetails) return html;
    
    Object.keys(documentDetails).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      html = html.replace(regex, documentDetails[key] || '');
    });
    return html;
  };

  return (
    <div 
      className="w-full group relative"
      style={{
        '--tw-prose-body': block.styles?.color,
        '--tw-prose-headings': block.styles?.color,
        '--tw-prose-links': block.styles?.color,
        '--tw-prose-bold': block.styles?.color,
        '--tw-prose-quotes': block.styles?.color,
        fontSize: block.styles?.fontSize ? `${block.styles.fontSize}px` : undefined,
        fontFamily: block.styles?.fontFamily || undefined,
        color: block.styles?.color || undefined,
      } as React.CSSProperties}
    >
      {isSelected ? (
        <div className="bg-white border border-indigo-200 rounded-lg p-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
          {editor && (
            <div className="flex items-center gap-1 mb-2 border-b border-gray-100 pb-2 flex-wrap">
              <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1 rounded ${editor.isActive('bold') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}><b>B</b></button>
              <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1 rounded ${editor.isActive('italic') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}><i>I</i></button>
              <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-1 rounded ${editor.isActive('strike') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}><s>S</s></button>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1 rounded ${editor.isActive('bulletList') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>• List</button>
              <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1 rounded ${editor.isActive('orderedList') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>1. List</button>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <select 
                onChange={(e) => {
                  if (e.target.value) {
                    editor.chain().focus().insertContent(`{{${e.target.value}}}`).run();
                    e.target.value = '';
                  }
                }}
                className="text-xs border border-gray-200 rounded px-2 py-1 text-indigo-600 bg-indigo-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">{`{ }`} Insert Variable</option>
                <option value="clientName">Client Name</option>
                <option value="clientEmail">Client Email</option>
                <option value="clientAddress">Client Address</option>
                <option value="employeeName">Employee Name</option>
                <option value="employeeEmail">Employee Email</option>
                <option value="totalAmount">Total Amount</option>
                <option value="validUntil">Valid Until</option>
              </select>
            </div>
          )}
          <EditorContent editor={editor} className="prose max-w-none text-gray-700 min-h-[50px] outline-none" />
        </div>
      ) : (
        <div 
          className="prose max-w-none text-gray-700 min-h-[24px] pointer-events-none"
          dangerouslySetInnerHTML={{ __html: getRenderedHtml() }}
        />
      )}
    </div>
  );
}
