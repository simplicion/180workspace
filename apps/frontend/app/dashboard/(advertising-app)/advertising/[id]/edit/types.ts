export type ElementType = 'box' | 'text' | 'media' | 'button' | 'line' | 'section';

export interface ElementNode {
    id: string;
    type: ElementType;
    data: any;
    style: any;
    children?: ElementNode[];
}
