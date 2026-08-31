'use client';

import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateBlock, Block } from '@/redux/slices/documentSlice';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

import { autoLinkUrls } from '../utils/autoLinkUrls';

interface TextBlockProps {
  block: Block;
  isSelected: boolean;
}

export function TextBlock({ block, isSelected }: TextBlockProps) {
  const dispatch = useDispatch();
  const documentDetails = useSelector((state: any) => state.document?.documentDetails);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
    ],
    content: block.content?.text || (block.type === 'heading' ? `<h2>${block.content?.text || 'Heading'}</h2>` : '<p>Enter text...</p>'),
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
      if (isSelected && !editor.isFocused) {
        editor.commands.focus('end');
      }
    }
  }, [editor, isSelected]);

  // Sync external text updates if changed from outside
  useEffect(() => {
    if (editor && block.content?.text !== undefined && editor.getHTML() !== block.content.text) {
      // only update if not focused to prevent cursor jumping
      if (!editor.isFocused) {
        editor.commands.setContent(block.content.text || '<p></p>');
      }
    }
  }, [block.content?.text, editor]);

  // Computed styles from block.styles
  const computedStyles: React.CSSProperties = useMemo(() => {
    const s = block.styles || {};

    const letterSpacingMap: Record<string, string> = {
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
    };

    const fontWeightMap: Record<string, number> = {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      black: 900,
    };

    return {
      fontSize: s.fontSize ? `${s.fontSize}px` : undefined,
      fontFamily: (s.fontFamily as string) || undefined,
      fontWeight: s.fontWeight ? (fontWeightMap[s.fontWeight as string] || s.fontWeight) : undefined,
      fontStyle: (s.fontStyle as any) || undefined,
      textDecoration: (s.textDecoration as any) || undefined,
      color: (s.color as string) || undefined,
      backgroundColor: (s.highlightColor as string) || (s.backgroundColor as string) || undefined,
      textAlign: (s.alignment as any) || (s.textAlign as any) || 'left',
      lineHeight: (s.lineHeight as any) || 1.6,
      letterSpacing: s.letterSpacing ? (letterSpacingMap[s.letterSpacing as string] || s.letterSpacing) : undefined,
      textTransform: (s.textTransform as any) || undefined,
      textShadow: (s.textShadow as string) || undefined,
      padding: s.padding ? `${s.padding}` : undefined,
      borderRadius: s.borderRadius ? `${s.borderRadius}px` : undefined,
      border: s.borderColor ? `${s.borderWidth || 1}px ${s.borderStyle || 'solid'} ${s.borderColor}` : undefined,
    };
  }, [block.styles]);

  // Replace template variables dynamically on view
  const getRenderedHtml = () => {
    let html = block.content?.text || (block.type === 'heading' ? `<h2>${block.content?.text || 'Heading'}</h2>` : '<p>Enter text...</p>');
    
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
      html = html.replace(regex, val);
    });
    return autoLinkUrls(html);
  };

  return (
    <div 
      className="w-full group relative transition-all"
      style={computedStyles}
    >
      {isSelected ? (
        <EditorContent 
          editor={editor} 
          className="prose max-w-none min-h-[32px] outline-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[32px] [&_*]:text-inherit [&_p]:font-inherit [&_a]:!text-blue-600 [&_a]:!underline" 
        />
      ) : (
        <div 
          className="prose max-w-none min-h-[24px] pointer-events-none [&_*]:text-inherit [&_p]:font-inherit [&_a]:pointer-events-auto [&_a]:!text-blue-600 [&_a]:!underline [&_a]:cursor-pointer"
          dangerouslySetInnerHTML={{ __html: getRenderedHtml() }}
        />
      )}
    </div>
  );
}
