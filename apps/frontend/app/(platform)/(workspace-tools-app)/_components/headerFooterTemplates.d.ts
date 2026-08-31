import { Block } from '../../../../redux/slices/documentSlice';
export interface HeaderFooterTemplate {
    id: string;
    name: string;
    description?: string;
    blocks: Block[];
}
export declare const HEADER_TEMPLATES: HeaderFooterTemplate[];
export declare const FOOTER_TEMPLATES: HeaderFooterTemplate[];
