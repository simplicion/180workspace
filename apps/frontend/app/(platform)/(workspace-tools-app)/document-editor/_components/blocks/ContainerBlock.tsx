'use client';

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateBlock, Block, insertBlockAt } from '../../../../../../redux/slices/documentSlice';
import { LayoutGrid, Plus } from 'lucide-react';
import clsx from 'clsx';
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dynamic from 'next/dynamic';
import { createDefaultDocumentBlock } from '../ElementsCatalogPanel';
import toast from 'react-hot-toast';

const SortableBlock = dynamic(() => import('../SortableBlock').then(m => m.SortableBlock), { ssr: false });

interface ContainerBlockProps {
  block: Block;
  isSelected: boolean;
  isPublicViewer?: boolean;
}

export function ContainerBlock({ block, isSelected, isPublicViewer = false }: ContainerBlockProps) {
  const dispatch = useDispatch();
  const allBlocks = useSelector((state: any) => state.document?.blocks || []);
  const childBlocks = allBlocks.filter((b: any) => b.parentId === block.id);
  const documentDetails = useSelector((state: any) => state.document?.documentDetails);

  const [nativeDragOverIndex, setNativeDragOverIndex] = useState<number | null>(null);

  const content = block.content || {};
  const direction: 'row' | 'column' = content.direction || 'row';
  const justifyContent = content.justifyContent || 'flex-start';
  const alignItems = content.alignItems || 'center';
  const gap = content.gap !== undefined ? Number(content.gap) : 16;
  const wrap = content.wrap !== undefined ? content.wrap : true;

  const handleDropNewBlock = (blockType: string, index: number) => {
    const newBlock = createDefaultDocumentBlock(blockType, documentDetails);
    dispatch(insertBlockAt({ block: newBlock, index, parentId: block.id }));
    toast.success(`Added ${newBlock.type} to container`, { id: 'container-drop-toast', duration: 1500, icon: '✨' });
  };

  // Container styling
  const s = block.styles || {};
  const backgroundColor = (s.backgroundColor as string) || 'transparent';
  const borderColor = (s.borderColor as string) || (isSelected ? '#6366f1' : (s.borderWidth ? '#e2e8f0' : 'transparent'));
  const borderStyle = (s.borderStyle as any) || (isSelected && !s.borderWidth ? 'dashed' : (s.borderStyle || 'solid'));
  const borderWidth = s.borderWidth !== undefined ? Number(s.borderWidth) : (isSelected ? 1 : 0);
  const borderRadius = s.borderRadius !== undefined ? Number(s.borderRadius) : 8;
  const padding = s.padding !== undefined ? (typeof s.padding === 'number' ? `${s.padding}px` : s.padding) : '16px';
  const boxShadow = (s.boxShadow as string) || 'none';
  const minHeight = s.minHeight || (childBlocks.length === 0 ? '70px' : 'auto');

  return (
    <div className="w-full relative group">
      {/* Main Flex Container Box */}
      <div 
        style={{
          display: 'flex',
          flexDirection: direction,
          justifyContent: justifyContent,
          alignItems: alignItems,
          gap: `${gap}px`,
          flexWrap: wrap ? 'wrap' : 'nowrap',
          backgroundColor,
          borderColor: borderStyle === 'none' ? 'transparent' : borderColor,
          borderStyle,
          borderWidth: `${borderWidth}px`,
          borderRadius: `${borderRadius}px`,
          padding,
          boxShadow,
          minHeight
        }}
        className="w-full transition-all relative"
      >
        <SortableContext 
            items={childBlocks.map((b: any) => b.id)} 
            strategy={direction === 'row' ? horizontalListSortingStrategy : verticalListSortingStrategy}
        >
          {childBlocks.length === 0 ? (
            <div
              className={clsx(
                "w-full py-6 px-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[100px]",
                nativeDragOverIndex === 0
                  ? "bg-indigo-50/90 border-indigo-500 scale-[1.01] shadow-inner"
                  : "border-gray-300 hover:border-indigo-300 bg-gray-50/40 hover:bg-indigo-50/20"
              )}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(0); }}
              onDragLeave={(e) => { e.preventDefault(); if (nativeDragOverIndex === 0) setNativeDragOverIndex(null); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setNativeDragOverIndex(null);
                const blockType = e.dataTransfer.getData('newBlockType') || e.dataTransfer.getData('text/plain');
                if (blockType) {
                    const absIndex = allBlocks.length; 
                    handleDropNewBlock(blockType, absIndex);
                }
              }}
            >
              <LayoutGrid className="w-6 h-6 mb-2 text-indigo-400 stroke-1" />
              <p className="text-xs font-semibold text-gray-700">Empty Container ({direction === 'row' ? 'Row Layout' : 'Column Layout'})</p>
              <p className="text-[11px] text-gray-500 mt-1">Drag & Drop blocks here</p>
            </div>
          ) : (
            <>
              {/* Top/Left Dropzone */}
              <div
                  className={clsx(
                      "transition-all duration-200 flex items-center justify-center relative z-50 rounded-xl",
                      direction === 'column' ? "w-full -mb-2" : "h-full -mr-2",
                      nativeDragOverIndex === 0
                          ? (direction === 'column' ? "h-12 bg-indigo-50/90 border-2 border-indigo-400 border-dashed mb-2 mt-1 shadow-inner" : "w-12 bg-indigo-50/90 border-2 border-indigo-400 border-dashed mr-2 ml-1 shadow-inner")
                          : (direction === 'column' ? "h-2 opacity-0 hover:opacity-100 hover:h-4" : "w-2 opacity-0 hover:opacity-100 hover:w-4")
                  )}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(0); }}
                  onDragLeave={(e) => { e.preventDefault(); if (nativeDragOverIndex === 0) setNativeDragOverIndex(null); }}
                  onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setNativeDragOverIndex(null);
                      const blockType = e.dataTransfer.getData('newBlockType') || e.dataTransfer.getData('text/plain');
                      if (blockType) {
                          const insertIndex = childBlocks[0] ? allBlocks.findIndex((b: any) => b.id === childBlocks[0].id) : allBlocks.length;
                          handleDropNewBlock(blockType, insertIndex);
                      }
                  }}
              >
                  {nativeDragOverIndex === 0 && (
                      <span className="text-indigo-600 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                          <Plus className="w-3 h-3" /> Drop
                      </span>
                  )}
              </div>

              {childBlocks.map((childBlock: any, idx: number) => {
                  const globalIndex = allBlocks.findIndex((b: any) => b.id === childBlock.id);
                  return (
                      <React.Fragment key={childBlock.id}>
                          <div 
                              style={{
                                width: childBlock.styles?.width || (direction === 'row' ? (childBlocks.length === 2 ? '48%' : childBlocks.length === 3 ? '31%' : 'auto') : '100%'),
                                flex: childBlock.styles?.flex || (direction === 'row' ? (childBlocks.length <= 3 ? '1 1 0px' : 'none') : 'none'),
                                minWidth: direction === 'row' ? '200px' : '100%'
                              }}
                          >
                            <SortableBlock block={childBlock} />
                          </div>

                          {/* Dropzone after this block */}
                          <div
                              className={clsx(
                                  "transition-all duration-200 flex items-center justify-center relative z-50 rounded-xl",
                                  direction === 'column' ? "w-full -my-2" : "h-full -mx-2",
                                  nativeDragOverIndex === idx + 1
                                      ? (direction === 'column' ? "h-12 bg-indigo-50/90 border-2 border-indigo-400 border-dashed my-2 shadow-inner" : "w-12 bg-indigo-50/90 border-2 border-indigo-400 border-dashed mx-2 shadow-inner")
                                      : (direction === 'column' ? "h-2 opacity-0 hover:opacity-100 hover:h-4" : "w-2 opacity-0 hover:opacity-100 hover:w-4")
                              )}
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setNativeDragOverIndex(idx + 1); }}
                              onDragLeave={(e) => { e.preventDefault(); if (nativeDragOverIndex === idx + 1) setNativeDragOverIndex(null); }}
                              onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setNativeDragOverIndex(null);
                                  const blockType = e.dataTransfer.getData('newBlockType') || e.dataTransfer.getData('text/plain');
                                  if (blockType) {
                                      handleDropNewBlock(blockType, globalIndex + 1);
                                  }
                              }}
                          >
                              {nativeDragOverIndex === idx + 1 && (
                                  <span className="text-indigo-600 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                                      <Plus className="w-3 h-3" /> Drop
                                  </span>
                              )}
                          </div>
                      </React.Fragment>
                  );
              })}
            </>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
