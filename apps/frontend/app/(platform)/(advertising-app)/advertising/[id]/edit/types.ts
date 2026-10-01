export type ElementType = 'box' | 'text' | 'media' | 'button' | 'line' | 'section' | 'row' | 'column' | 'image' | 'code' | 'floating';

/** Device breakpoints. desktop = base styles; tablet ≤ 1024px; mobile ≤ 767px (container queries on the site root). */
export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

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
    /** Per-device style overrides, merged over `style` (desktop = base). Cascades desktop → tablet → mobile. */
    responsive?: { tablet?: Record<string, any>; mobile?: Record<string, any> };
    /** Hide on specific devices. */
    hiddenOn?: { desktop?: boolean; tablet?: boolean; mobile?: boolean };
}
