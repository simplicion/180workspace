import React from 'react';
import { ElementNode } from '../../../../dashboard/(advertising-app)/advertising/[id]/edit/types';
import { motion } from 'framer-motion';

const getAnimationProps = (animationType?: string) => {
    switch (animationType) {
        case 'fade-in':
            return { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true, margin: "-50px" }, transition: { duration: 0.6 } };
        case 'fade-up':
            return { initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-50px" }, transition: { duration: 0.6, ease: "easeOut" as const } };
        case 'fade-left':
            return { initial: { opacity: 0, x: -40 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true, margin: "-50px" }, transition: { duration: 0.6, ease: "easeOut" as const } };
        case 'fade-right':
            return { initial: { opacity: 0, x: 40 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true, margin: "-50px" }, transition: { duration: 0.6, ease: "easeOut" as const } };
        case 'scale-up':
            return { initial: { opacity: 0, scale: 0.8 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: true, margin: "-50px" }, transition: { duration: 0.5, type: 'spring' as const, bounce: 0.3 } };
        default:
            return {};
    }
};

const AnimatedWrapper = ({ animation, children, style, className }: any) => {
    if (!animation || animation === 'none') {
        return <>{children}</>;
    }
    const props = getAnimationProps(animation);
    return <motion.div {...(props as any)} style={style} className={className}>{children}</motion.div>;
};


interface PublicRenderElementProps {
    node: ElementNode;
}

export function PublicRenderElement({ node }: PublicRenderElementProps) {
    if (!node) return null;

    if (node.type === 'section' || node.type === 'box' || node.type === 'row' || node.type === 'column') {
        let display = node.style?.display;
        let flexDirection = node.style?.flexDirection;
        let flexWrap = node.style?.flexWrap;

        if (node.type === 'row') {
            display = 'flex';
            flexDirection = 'row';
            flexWrap = 'wrap';
        } else if (node.type === 'column') {
            display = 'flex';
            flexDirection = 'column';
        } else if (node.type === 'box') {
            display = display || 'flex';
        } else {
            display = display || 'block';
        }

        const style = {
            ...node.style,
            display,
            flexDirection,
            flexWrap,
            width: node.style?.width || '100%',
        };
        const content = (
            <div style={style as any} className="relative">
                {node.children?.map(child => (
                    <PublicRenderElement key={child.id} node={child} />
                ))}
            </div>
        );
        return <AnimatedWrapper animation={node.animation}>{content}</AnimatedWrapper>;
    }

    if (node.type === 'text') {
        const Tag: any = node.style?.tagName || 'div';
        const style = {
            fontSize: node.style?.fontSize,
            fontWeight: node.style?.fontWeight,
            textAlign: node.style?.textAlign,
            color: node.style?.color,
            opacity: node.style?.opacity,
            marginBottom: node.style?.marginBottom,
            ...node.style
        };
        const content = (
            <Tag 
                style={style as any} 
                dangerouslySetInnerHTML={{ __html: node.data?.content || '' }} 
            />
        );
        return <AnimatedWrapper animation={node.animation}>{content}</AnimatedWrapper>;
    }

    if (node.type === 'media' || node.type === 'image') {
        const mediaUrl = node.data?.imageUrl || node.data?.videoUrl || node.data?.src;
        const isVideo = mediaUrl && (mediaUrl.endsWith('.m3u8') || mediaUrl.endsWith('.mp4'));
        const style = {
            width: '100%', 
            height: '100%', 
            objectFit: 'cover' as any, 
            borderRadius: node.style?.borderRadius,
            ...node.style
        };

        if (!mediaUrl) return null;

        const content = isVideo 
            ? <video src={mediaUrl} controls autoPlay muted loop style={style as any} />
            : <img src={mediaUrl} alt="" style={style as any} />;
            
        return <AnimatedWrapper animation={node.animation}>{content}</AnimatedWrapper>;
    }

    if (node.type === 'button') {
        const style = {
            backgroundColor: node.style?.backgroundColor || '#4f46e5',
            color: node.style?.color || 'white',
            padding: node.style?.padding || '0.75rem 1.5rem',
            borderRadius: node.style?.borderRadius || '0.375rem',
            fontWeight: node.style?.fontWeight || '600',
            textDecoration: 'none',
            display: 'inline-block',
            textAlign: 'center' as any,
            ...node.style
        };
        const link = node.data?.link || '#';
        const content = (
            <a href={link} style={style as any}>
                {node.data?.content || node.data?.label || 'Button'}
            </a>
        );
        return <AnimatedWrapper animation={node.animation}>{content}</AnimatedWrapper>;
    }

    if (node.type === 'line') {
        const isVertical = node.style?.direction === 'vertical';
        const style = {
            width: isVertical ? (node.style?.thickness || '2px') : '100%',
            height: isVertical ? '100%' : (node.style?.thickness || '2px'),
            backgroundColor: node.style?.backgroundColor || '#e5e7eb',
            margin: isVertical ? '0 1rem' : '1rem 0',
            ...node.style
        };
        return <div style={style} />;
    }

    // Legacy Fallback for hardcoded types like 'hero', 'about', 'contact'
    // These were output by CreateWebsiteModal before being loaded into the builder.
    if (node.type === 'hero') {
        return (
            <section className="bg-indigo-50/50 py-24 relative overflow-hidden">
                <div className="max-w-6xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm mb-6">
                        {node.data?.badge || 'Welcome'}
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight max-w-4xl" style={{ fontFamily: 'var(--heading-font), sans-serif' }}>
                        {node.data?.title || 'Hero Title'}
                    </h1>
                    <p className="text-lg md:text-xl text-gray-500 mb-12 max-w-2xl leading-relaxed">
                        {node.data?.subtitle || 'Hero Subtitle'}
                    </p>
                    <a href="#" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-200">
                        {node.data?.buttonText || 'Get Started'}
                    </a>
                </div>
            </section>
        );
    }

    if (node.type === 'about') {
        return (
            <section className="py-24 bg-white">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6" style={{ fontFamily: 'var(--heading-font), sans-serif' }}>
                                {node.data?.title || 'About Us'}
                            </h2>
                            <p className="text-lg text-gray-500 leading-relaxed">
                                {node.data?.content || 'About description'}
                            </p>
                        </div>
                        <div className="rounded-2xl overflow-hidden shadow-xl">
                            {node.data?.image ? <img src={node.data.image} alt="About" className="w-full h-full object-cover" /> : null}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (node.type === 'contact') {
        return (
            <section className="py-24 bg-gray-50">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4" style={{ fontFamily: 'var(--heading-font), sans-serif' }}>
                        {node.data?.title || 'Contact Us'}
                    </h2>
                    <p className="text-gray-500 max-w-2xl mx-auto text-lg">
                        {node.data?.subtitle || 'Get in touch'}
                    </p>
                </div>
            </section>
        );
    }

    return null;
}
