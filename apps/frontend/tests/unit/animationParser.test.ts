import { getAdvancedAnimationProps } from '../../app/(platform)/(advertising-app)/advertising/[id]/edit/BuilderElement';

describe('getAdvancedAnimationProps', () => {
  it('returns null if no animation is provided', () => {
    expect(getAdvancedAnimationProps(undefined, 'none')).toBeNull();
    expect(getAdvancedAnimationProps(undefined, undefined)).toBeNull();
  });

  it('parses legacy string animations correctly', () => {
    const props = getAdvancedAnimationProps(undefined, 'fade-in');
    expect(props).not.toBeNull();
    expect(props?.initial).toEqual({ opacity: 0 });
    expect(props?.whileInView).toEqual({ opacity: 1 });
  });

  it('parses complex animation configurations', () => {
    const config = {
      entrance: { preset: 'fade-up', duration: 1, delay: 0.5, easing: 'easeOut' },
      hover: { preset: 'scale-up' },
      loop: { preset: 'pulse', duration: 2 }
    };

    const props = getAdvancedAnimationProps(config, undefined);
    
    // Entrance
    expect(props?.initial).toEqual({ opacity: 0, y: 40 });
    expect(props?.whileInView).toEqual({ opacity: 1, y: 0 });
    expect(props?.transition?.duration).toBe(2); // Overridden by loop duration in current logic? Wait, let's check transition.
    
    // Hover
    expect(props?.whileHover).toEqual({ scale: 1.05 });

    // Loop
    expect(props?.animate).toEqual({ scale: [1, 1.05, 1] });
    expect(props?.transition?.repeat).toBe(Infinity);
  });
});
