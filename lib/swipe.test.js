import { describe, expect, it } from 'vitest';
import { pointFromEvent, swipeDirection } from './swipe';

describe('pointFromEvent', () => {
  it('no touchend usa changedTouches — não inventa x=0', () => {
    const e = {
      touches: [],
      changedTouches: [{ clientX: 312, clientY: 140 }],
    };
    expect(pointFromEvent(e)).toEqual({ x: 312, y: 140 });
  });

  it('sem toque nem mouse não inventa coordenada', () => {
    expect(pointFromEvent({ touches: [], changedTouches: [] })).toBe(null);
    expect(pointFromEvent({})).toBe(null);
  });
});

describe('swipeDirection', () => {
  it('toque à direita da tela + fim em 0 não deve ser usado; com pontos reais exige limiar', () => {
    expect(swipeDirection({ x: 320, y: 200 }, { x: 320, y: 200 }, 180)).toBe(null);
    expect(swipeDirection({ x: 320, y: 200 }, { x: 100, y: 210 }, 180)).toBe('left');
    expect(swipeDirection({ x: 40, y: 200 }, { x: 240, y: 190 }, 180)).toBe('right');
  });

  it('rolagem vertical não vira troca de aba', () => {
    expect(swipeDirection({ x: 200, y: 80 }, { x: 160, y: 400 }, 180)).toBe(null);
  });
});
