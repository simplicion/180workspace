"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectMetaType = exports.selectDesignSettings = exports.selectSelectedBlockId = exports.selectBlocks = exports.selectDocumentDetails = exports.setFooterBlocks = exports.setHeaderBlocks = exports.updateDesignSettings = exports.reorderBlocks = exports.setBlocks = exports.setDocumentDetails = exports.updateDocumentDetails = exports.initializeDocument = exports.updateMetaType = exports.setZoomLevel = exports.selectBlock = exports.duplicateBlock = exports.removeBlock = exports.updateBlock = exports.insertBlockAt = exports.addBlock = exports.redo = exports.undo = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {
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
        companyName: 'Company Name',
        companyAddress: 'Company Address',
        companyEmail: 'company@example.com',
        companyPhone: '+9999999999',
        companyWebsite: 'www.company.com',
        companyGst: 'TAX-ID-0000',
        authorizedSignatory: 'Authorized Signatory',
    },
    designSettings: {
        fontFamily: 'Inter, sans-serif',
        pageBackground: '#FFFFFF',
        pagePadding: '40px',
        fontSize: 16,
        primaryColor: '#2563eb',
        selectedHeaderId: 'header-corporate',
        selectedFooterId: 'footer-corporate',
    },
};
const saveHistory = (state) => {
    state.past.push({ blocks: JSON.parse(JSON.stringify(state.blocks)), documentDetails: JSON.parse(JSON.stringify(state.documentDetails)) });
    if (state.past.length > 20)
        state.past.shift();
    state.future = [];
};
const documentSlice = (0, toolkit_1.createSlice)({
    name: 'document',
    initialState,
    reducers: {
        undo: (state) => {
            if (state.past.length === 0)
                return;
            const previous = state.past.pop();
            if (previous) {
                state.future.push({ blocks: state.blocks, documentDetails: state.documentDetails });
                state.blocks = previous.blocks;
                state.documentDetails = previous.documentDetails;
            }
        },
        redo: (state) => {
            if (state.future.length === 0)
                return;
            const next = state.future.pop();
            if (next) {
                state.past.push({ blocks: state.blocks, documentDetails: state.documentDetails });
                state.blocks = next.blocks;
                state.documentDetails = next.documentDetails;
            }
        },
        addBlock: (state, action) => {
            saveHistory(state);
            const newBlock = action.payload;
            if (!newBlock.styles) {
                newBlock.styles = { textAlign: 'center' };
            }
            else if (!newBlock.styles.textAlign) {
                newBlock.styles.textAlign = 'center';
            }
            state.blocks.push(newBlock);
            state.selectedBlockId = newBlock.id;
        },
        insertBlockAt: (state, action) => {
            saveHistory(state);
            const { block, index, parentId } = action.payload;
            if (!block.styles) {
                block.styles = { textAlign: 'center' };
            }
            else if (!block.styles.textAlign) {
                block.styles.textAlign = 'center';
            }
            if (parentId) {
                block.parentId = parentId;
            }
            const safeIndex = Math.max(0, Math.min(state.blocks.length, index));
            state.blocks.splice(safeIndex, 0, block);
            state.selectedBlockId = block.id;
        },
        updateBlock: (state, action) => {
            const { id, updates, ...rest } = action.payload;
            const mergedUpdates = updates ? updates : rest;
            let index = state.blocks.findIndex((b) => b.id === id);
            if (index !== -1) {
                state.blocks[index] = { ...state.blocks[index], ...mergedUpdates };
                return;
            }
            index = state.headerBlocks.findIndex((b) => b.id === id);
            if (index !== -1) {
                state.headerBlocks[index] = { ...state.headerBlocks[index], ...mergedUpdates };
                return;
            }
            index = state.footerBlocks.findIndex((b) => b.id === id);
            if (index !== -1) {
                state.footerBlocks[index] = { ...state.footerBlocks[index], ...mergedUpdates };
                return;
            }
        },
        initializeDocument: (state, action) => {
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
        removeBlock: (state, action) => {
            saveHistory(state);
            state.blocks = state.blocks.filter((b) => b.id !== action.payload);
            state.headerBlocks = state.headerBlocks.filter((b) => b.id !== action.payload);
            state.footerBlocks = state.footerBlocks.filter((b) => b.id !== action.payload);
        },
        duplicateBlock: (state, action) => {
            saveHistory(state);
            const id = action.payload;
            const duplicateInArray = (arr) => {
                const index = arr.findIndex((b) => b.id === id);
                if (index !== -1) {
                    const newBlock = { ...JSON.parse(JSON.stringify(arr[index])), id: Date.now().toString() };
                    arr.splice(index + 1, 0, newBlock);
                    state.selectedBlockId = newBlock.id;
                    return true;
                }
                return false;
            };
            if (duplicateInArray(state.blocks))
                return;
            if (duplicateInArray(state.headerBlocks))
                return;
            duplicateInArray(state.footerBlocks);
        },
        selectBlock: (state, action) => {
            state.selectedBlockId = action.payload;
        },
        setZoomLevel: (state, action) => {
            state.zoomLevel = action.payload;
        },
        updateMetaType: (state, action) => {
            saveHistory(state);
            state.metaType = action.payload;
        },
        updateDocumentDetails: (state, action) => {
            state.documentDetails = { ...state.documentDetails, ...action.payload };
        },
        reorderBlocks: (state, action) => {
            saveHistory(state);
            const { oldIndex, newIndex } = action.payload;
            const [removed] = state.blocks.splice(oldIndex, 1);
            state.blocks.splice(newIndex, 0, removed);
        },
        updateDesignSettings: (state, action) => {
            state.designSettings = { ...state.designSettings, ...action.payload };
        },
        setBlocks: (state, action) => {
            saveHistory(state);
            state.blocks = action.payload;
        },
        setDocumentDetails: (state, action) => {
            state.documentDetails = { ...state.documentDetails, ...action.payload };
        },
        setHeaderBlocks: (state, action) => {
            state.headerBlocks = action.payload;
        },
        setFooterBlocks: (state, action) => {
            state.footerBlocks = action.payload;
        },
    },
});
_a = documentSlice.actions, exports.undo = _a.undo, exports.redo = _a.redo, exports.addBlock = _a.addBlock, exports.insertBlockAt = _a.insertBlockAt, exports.updateBlock = _a.updateBlock, exports.removeBlock = _a.removeBlock, exports.duplicateBlock = _a.duplicateBlock, exports.selectBlock = _a.selectBlock, exports.setZoomLevel = _a.setZoomLevel, exports.updateMetaType = _a.updateMetaType, exports.initializeDocument = _a.initializeDocument, exports.updateDocumentDetails = _a.updateDocumentDetails, exports.setDocumentDetails = _a.setDocumentDetails, exports.setBlocks = _a.setBlocks, exports.reorderBlocks = _a.reorderBlocks, exports.updateDesignSettings = _a.updateDesignSettings, exports.setHeaderBlocks = _a.setHeaderBlocks, exports.setFooterBlocks = _a.setFooterBlocks;
const selectDocumentDetails = (state) => state.document?.documentDetails;
exports.selectDocumentDetails = selectDocumentDetails;
const selectBlocks = (state) => state.document?.blocks || [];
exports.selectBlocks = selectBlocks;
const selectSelectedBlockId = (state) => state.document?.selectedBlockId || null;
exports.selectSelectedBlockId = selectSelectedBlockId;
const selectDesignSettings = (state) => state.document?.designSettings;
exports.selectDesignSettings = selectDesignSettings;
const selectMetaType = (state) => state.document?.metaType;
exports.selectMetaType = selectMetaType;
exports.default = documentSlice.reducer;
