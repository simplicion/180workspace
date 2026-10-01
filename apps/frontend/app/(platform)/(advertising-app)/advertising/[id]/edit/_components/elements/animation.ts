/** Framer-motion props from a node's animation config. Pure (no React), safe in server components. */
export const getAdvancedAnimationProps = (config?: any, legacyAnimation?: string) => {
    if (!config && (!legacyAnimation || legacyAnimation === 'none')) return null;
    
    // Normalize to config object
    const animationConfig = config || {
        entrance: { preset: legacyAnimation || 'none', duration: 0.6, delay: 0, easing: 'easeOut' }
    };

    let initial: any = {};
    let whileInView: any = {};
    let whileHover: any = {};
    let animate: any = {};
    let transition: any = { duration: 0.6 };

    // Entrance
    const ent = animationConfig.entrance;
    if (ent && ent.preset && ent.preset !== 'none') {
        transition.duration = ent.duration || 0.6;
        transition.delay = ent.delay || 0;
        transition.ease = ent.easing || "easeOut";

        switch (ent.preset) {
            case 'fade-in': initial = { ...initial, opacity: 0 }; whileInView = { ...whileInView, opacity: 1 }; break;
            case 'fade-up': initial = { ...initial, opacity: 0, y: 40 }; whileInView = { ...whileInView, opacity: 1, y: 0 }; break;
            case 'fade-down': initial = { ...initial, opacity: 0, y: -40 }; whileInView = { ...whileInView, opacity: 1, y: 0 }; break;
            case 'fade-left': initial = { ...initial, opacity: 0, x: -40 }; whileInView = { ...whileInView, opacity: 1, x: 0 }; break;
            case 'fade-right': initial = { ...initial, opacity: 0, x: 40 }; whileInView = { ...whileInView, opacity: 1, x: 0 }; break;
            case 'scale-up': initial = { ...initial, opacity: 0, scale: 0.8 }; whileInView = { ...whileInView, opacity: 1, scale: 1 }; break;
            case 'scale-down': initial = { ...initial, opacity: 0, scale: 1.2 }; whileInView = { ...whileInView, opacity: 1, scale: 1 }; break;
            case 'flip-in-x': initial = { ...initial, opacity: 0, rotateX: 90 }; whileInView = { ...whileInView, opacity: 1, rotateX: 0 }; break;
            case 'flip-in-y': initial = { ...initial, opacity: 0, rotateY: 90 }; whileInView = { ...whileInView, opacity: 1, rotateY: 0 }; break;
            case 'bounce-in': initial = { ...initial, opacity: 0, y: 40 }; whileInView = { ...whileInView, opacity: 1, y: 0 }; transition.type = 'spring'; transition.bounce = 0.5; break;
        }
    }

    // Hover
    const hov = animationConfig.hover;
    if (hov && hov.preset && hov.preset !== 'none') {
        switch (hov.preset) {
            case 'scale-up': whileHover = { ...whileHover, scale: 1.05 }; break;
            case 'scale-down': whileHover = { ...whileHover, scale: 0.95 }; break;
            case 'lift': whileHover = { ...whileHover, y: -5 }; break;
            case 'glow': whileHover = { ...whileHover, boxShadow: "0px 0px 15px rgba(99, 102, 241, 0.5)" }; break;
        }
    }

    // Loop
    const lp = animationConfig.loop;
    if (lp && lp.preset && lp.preset !== 'none') {
        switch (lp.preset) {
            case 'pulse': animate = { ...animate, scale: [1, 1.05, 1] }; break;
            case 'shake': animate = { ...animate, x: [0, -10, 10, -10, 10, 0] }; break;
            case 'spin': animate = { ...animate, rotate: [0, 360] }; break;
            case 'bounce': animate = { ...animate, y: [0, -20, 0] }; break;
            case 'float': animate = { ...animate, y: [0, -10, 0] }; break;
        }
        transition = { ...transition, repeat: Infinity, duration: lp.duration || 2, ease: lp.easing || 'easeInOut' };
    }

    const props: any = {};
    if (Object.keys(initial).length > 0) props.initial = initial;
    if (Object.keys(whileInView).length > 0) {
        props.whileInView = whileInView;
        props.viewport = { once: true, margin: "-50px" };
    }
    if (Object.keys(whileHover).length > 0) props.whileHover = whileHover;
    if (Object.keys(animate).length > 0) props.animate = animate;
    if (Object.keys(transition).length > 0) props.transition = transition;

    return Object.keys(props).length > 0 ? props : null;
};
