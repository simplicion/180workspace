export type ElementType = 'box' | 'text' | 'media' | 'button' | 'line' | 'section' | 'row' | 'column' | 'image' | 'code' | 'floating';

export interface ElementNode {
    id: string;
    type: ElementType;
    data: any;
    style: any;
    animation?: string;
    children?: ElementNode[];
    name?: string;
}
