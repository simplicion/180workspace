export type ElementType = 'box' | 'text' | 'media' | 'button' | 'line' | 'section' | 'row' | 'column' | 'image' | 'code' | 'floating';

export interface ElementNode {
    id: string;
    type: ElementType;
    data: any;
    style: any;
    animation?: string;
    animationConfig?: {
        entrance?: { preset: string; duration?: number; delay?: number; easing?: string };
        hover?: { preset: string; duration?: number; delay?: number; easing?: string };
        loop?: { preset: string; duration?: number; delay?: number; easing?: string };
    };
    children?: ElementNode[];
    name?: string;
}
