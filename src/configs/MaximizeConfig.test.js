import { describe, it, expect } from '@jest/globals';
import MaximizeConfig from './MaximizeConfig.js';

describe('MaximizeConfig', () => {
  it('is optional and supplies popup defaults', () => {
    expect(new MaximizeConfig().enabled).toBeFalsy();
    expect(new MaximizeConfig(false).enabled).toBeFalsy();
    expect(new MaximizeConfig(true, 'Tracking')).toMatchObject({ enabled: true, title: 'Tracking', popupStyle: 'fullscreen', cardSize: 12 });
  });
  it('allows custom settings and disabling an object configuration', () => {
    expect(new MaximizeConfig({ title: 'Example', popup_style: 'fullscreen', card_size: 15 })).toMatchObject({ enabled: true, title: 'Example', popupStyle: 'fullscreen', cardSize: 15 });
    expect(new MaximizeConfig({ enabled: false }).enabled).toBe(false);
  });
  it('rejects invalid popup dimensions and style', () => {
    for (const card_size of [0, -1, Infinity, NaN, '12']) {
      expect(() => new MaximizeConfig({ card_size })).toThrow('positive number');
    }
    expect(() => new MaximizeConfig({ popup_style: 'invalid' })).toThrow('popup_style');
  });
});
