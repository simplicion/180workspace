export type BlockType = 'text' | 'heading' | 'list' | 'grid' | 'pricing_table' | 'payment_checkout' | 'payment' | 'checkout' | 'divider' | 'line' | 'box' | 'container' | 'image' | 'signature' | 'approval_buttons' | 'decision' | 'input' | 'pagebreak';
export type MetaType = 'general' | 'quotation' | 'invoice' | 'contract';
export interface Block {
    id: string;
    type: BlockType;
    content: any;
    position?: {
        x: number;
        y: number;
    };
    size?: {
        width: number | string;
        height: number | string;
    };
    styles?: Record<string, string | number>;
    visibilityRule?: string | {
        field: string;
        operator: string;
        value: string;
    };
    parentId?: string;
}
export interface DocumentState {
    past: {
        blocks: Block[];
        documentDetails: any;
    }[];
    future: {
        blocks: Block[];
        documentDetails: any;
    }[];
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
        projectName?: string;
        selectedProjectId?: string;
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
        companyName?: string;
        companyAddress?: string;
        companyEmail?: string;
        companyPhone?: string;
        companyWebsite?: string;
        companyGst?: string;
        authorizedSignatory?: string;
    };
    designSettings: {
        fontFamily: string;
        fontSize: number;
        primaryColor: string;
        selectedHeaderId?: string;
        selectedFooterId?: string;
        pageBackground?: string;
        pagePadding?: string;
    };
}
export declare const undo: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"document/undo">, redo: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"document/redo">, addBlock: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Block, "document/addBlock">, insertBlockAt: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<{
    block: Block;
    index: number;
    parentId?: string;
}, "document/insertBlockAt">, updateBlock: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<{
    id: string;
    updates?: Partial<Block>;
    styles?: any;
    content?: any;
    position?: any;
    size?: any;
    visibilityRule?: any;
}, "document/updateBlock">, removeBlock: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string, "document/removeBlock">, duplicateBlock: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string, "document/duplicateBlock">, selectBlock: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string, "document/selectBlock">, setZoomLevel: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<number, "document/setZoomLevel">, updateMetaType: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<MetaType, "document/updateMetaType">, initializeDocument: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<{
    blocks: Block[];
    headerBlocks?: Block[];
    footerBlocks?: Block[];
    documentDetails?: any;
}, "document/initializeDocument">, updateDocumentDetails: import("@reduxjs/toolkit").ActionCreatorWithNonInferrablePayload<"document/updateDocumentDetails">, setDocumentDetails: import("@reduxjs/toolkit").ActionCreatorWithNonInferrablePayload<"document/setDocumentDetails">, setBlocks: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Block[], "document/setBlocks">, reorderBlocks: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<{
    oldIndex: number;
    newIndex: number;
}, "document/reorderBlocks">, updateDesignSettings: import("@reduxjs/toolkit").ActionCreatorWithNonInferrablePayload<"document/updateDesignSettings">, setHeaderBlocks: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Block[], "document/setHeaderBlocks">, setFooterBlocks: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<Block[], "document/setFooterBlocks">;
export declare const selectDocumentDetails: (state: any) => any;
export declare const selectBlocks: (state: any) => any;
export declare const selectSelectedBlockId: (state: any) => any;
export declare const selectDesignSettings: (state: any) => any;
export declare const selectMetaType: (state: any) => any;
declare const _default: import("redux").Reducer<DocumentState>;
export default _default;
