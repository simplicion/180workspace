import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type BlockType = 'text' | 'heading' | 'list' | 'grid' | 'divider' | 'box' | 'image' | 'signature' | 'input' | 'pagebreak';
export type MetaType = 'general' | 'quotation' | 'invoice' | 'contract';

export interface Block {
  id: string;
  type: BlockType;
  content: any;
  position?: { x: number; y: number };
  size?: { width: number | string; height: number | string };
  styles?: Record<string, string | number>;
  visibilityRule?: string | { field: string; operator: string; value: string };
}

export interface DocumentState {
  past: { blocks: Block[]; documentDetails: any }[];
  future: { blocks: Block[]; documentDetails: any }[];
  blocks: Block[];
  headerBlocks: Block[];
  footerBlocks: Block[];
  selectedBlockId: string | null;
  zoomLevel: number;
  metaType: MetaType;
  documentDetails: {
    title: string;
    documentType: 'general' | 'invoice' | 'quotation' | 'contract' | 'hr';
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    clientAddress?: string;
    selectedClientId?: string;

    // Project details
    projectName?: string;
    selectedProjectId?: string;

    // Employee details
    employeeName?: string;
    employeeEmail?: string;
    employeeDesignation?: string;
    employeeSalary?: string;
    joiningDate?: string;
    selectedEmployeeId?: string;

    validUntil?: string;
    showTotalAmount?: boolean;
    totalAmount?: string;
    requireName?: boolean;
  };
  designSettings: {
    fontFamily: string;
    fontSize: number;
    primaryColor: string;
    selectedHeaderId?: string;
    selectedFooterId?: string;
  };
}

const initialState: DocumentState = {
  past: [],
  future: [],
  blocks: [],
  headerBlocks: [],
  footerBlocks: [],
  selectedBlockId: null,
  zoomLevel: 100,
  metaType: 'general',
  documentDetails: {
    title: '',
    documentType: 'general',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    selectedClientId: '',
    projectName: '',
    selectedProjectId: '',
    employeeName: '',
    employeeEmail: '',
    employeeDesignation: '',
    employeeSalary: '',
    joiningDate: '',
    selectedEmployeeId: '',
    validUntil: '',
    showTotalAmount: false,
    totalAmount: '0.00',
    requireName: false,
  },
  designSettings: {
    fontFamily: 'sans-serif',
    fontSize: 16,
    primaryColor: '#2563eb',
    selectedHeaderId: 'header-corporate',
    selectedFooterId: 'footer-corporate',
  },
};

const saveHistory = (state: DocumentState) => {
  state.past.push({ blocks: JSON.parse(JSON.stringify(state.blocks)), documentDetails: JSON.parse(JSON.stringify(state.documentDetails)) });
  if (state.past.length > 20) state.past.shift();
  state.future = [];
};

const documentSlice = createSlice({
  name: 'document',
  initialState,
  reducers: {
    undo: (state) => {
      if (state.past.length === 0) return;
      const previous = state.past.pop();
      if (previous) {
        state.future.push({ blocks: state.blocks, documentDetails: state.documentDetails });
        state.blocks = previous.blocks;
        state.documentDetails = previous.documentDetails;
      }
    },
    redo: (state) => {
      if (state.future.length === 0) return;
      const next = state.future.pop();
      if (next) {
        state.past.push({ blocks: state.blocks, documentDetails: state.documentDetails });
        state.blocks = next.blocks;
        state.documentDetails = next.documentDetails;
      }
    },
    addBlock: (state, action: PayloadAction<Block>) => {
      saveHistory(state);
      const newBlock = action.payload;
      if (!newBlock.styles) {
          newBlock.styles = { textAlign: 'center' };
      } else if (!newBlock.styles.textAlign) {
          newBlock.styles.textAlign = 'center';
      }
      state.blocks.push(newBlock);
    },
    updateBlock: (state, action: PayloadAction<{ id: string; updates: Partial<Block> }>) => {
      const id = action.payload.id;
      let index = state.blocks.findIndex((b) => b.id === id);
      if (index !== -1) {
        state.blocks[index] = { ...state.blocks[index], ...action.payload.updates };
        return;
      }
      index = state.headerBlocks.findIndex((b) => b.id === id);
      if (index !== -1) {
        state.headerBlocks[index] = { ...state.headerBlocks[index], ...action.payload.updates };
        return;
      }
      index = state.footerBlocks.findIndex((b) => b.id === id);
      if (index !== -1) {
        state.footerBlocks[index] = { ...state.footerBlocks[index], ...action.payload.updates };
        return;
      }
    },
    initializeDocument: (state, action: PayloadAction<{ blocks: Block[]; headerBlocks?: Block[]; footerBlocks?: Block[]; documentDetails?: any }>) => {
      state.blocks = action.payload.blocks || [];
      state.headerBlocks = action.payload.headerBlocks || [];
      state.footerBlocks = action.payload.footerBlocks || [];
      if (action.payload.documentDetails) {
        state.documentDetails = { ...state.documentDetails, ...action.payload.documentDetails };
      }
      state.past = [];
      state.future = [];
      state.selectedBlockId = null;
    },
    removeBlock: (state, action: PayloadAction<string>) => {
      saveHistory(state);
      state.blocks = state.blocks.filter((b) => b.id !== action.payload);
      state.headerBlocks = state.headerBlocks.filter((b) => b.id !== action.payload);
      state.footerBlocks = state.footerBlocks.filter((b) => b.id !== action.payload);
    },
    duplicateBlock: (state, action: PayloadAction<string>) => {
      saveHistory(state);
      const id = action.payload;
      
      const duplicateInArray = (arr: Block[]) => {
        const index = arr.findIndex((b) => b.id === id);
        if (index !== -1) {
          const newBlock = { ...JSON.parse(JSON.stringify(arr[index])), id: Date.now().toString() };
          arr.splice(index + 1, 0, newBlock);
          state.selectedBlockId = newBlock.id;
          return true;
        }
        return false;
      };

      if (duplicateInArray(state.blocks)) return;
      if (duplicateInArray(state.headerBlocks)) return;
      duplicateInArray(state.footerBlocks);
    },
    selectBlock: (state, action: PayloadAction<string | null>) => {
      state.selectedBlockId = action.payload;
    },
    setZoomLevel: (state, action: PayloadAction<number>) => {
      state.zoomLevel = action.payload;
    },
    updateMetaType: (state, action: PayloadAction<MetaType>) => {
      saveHistory(state);
      state.metaType = action.payload;
    },
    updateDocumentDetails: (state, action: PayloadAction<Partial<DocumentState['documentDetails']>>) => {
      state.documentDetails = { ...state.documentDetails, ...action.payload };
    },
    reorderBlocks: (state, action: PayloadAction<{ oldIndex: number; newIndex: number }>) => {
      saveHistory(state);
      const { oldIndex, newIndex } = action.payload;
      const [removed] = state.blocks.splice(oldIndex, 1);
      state.blocks.splice(newIndex, 0, removed);
    },
    updateDesignSettings: (state, action: PayloadAction<Partial<DocumentState['designSettings']>>) => {
      state.designSettings = { ...state.designSettings, ...action.payload };
    },
    setHeaderBlocks: (state, action: PayloadAction<Block[]>) => {
      state.headerBlocks = action.payload;
    },
    setFooterBlocks: (state, action: PayloadAction<Block[]>) => {
      state.footerBlocks = action.payload;
    },
  },
});

export const {
  undo,
  redo,
  addBlock,
  updateBlock,
  removeBlock,
  duplicateBlock,
  selectBlock,
  setZoomLevel,
  updateMetaType,
  initializeDocument,
  updateDocumentDetails,
  reorderBlocks,
  updateDesignSettings,
  setHeaderBlocks,
  setFooterBlocks,
} = documentSlice.actions;

export default documentSlice.reducer;
