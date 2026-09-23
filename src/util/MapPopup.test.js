import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { openMapPopup } from './MapPopup.js';
import MaximizeConfig from '../configs/MaximizeConfig.js';

describe('map popup', () => {
  afterEach(() => { delete window.browser_mod; });

  it('opens a local popup, preserving map settings without mutating the source', () => {
    window.browser_mod = {};
    const card = document.createElement('div');
    const listener = jest.fn();
    card.addEventListener('ll-custom', listener);
    const config = {
      title: 'Example', maximize: true, card_size: 5, grid_options: { columns: 6 },
      focus_entity: 'person.example', focus_follow: 'refocus_on_move', focus_follow_threshold: 25,
      focus_follow_pause: 5, zoom: 15, history_start: '6 hours ago',
      entities: [{ entity: 'person.example', position_update_threshold: 10 }],
      map_options: { minZoom: 15, maxZoom: 15 }
    };
    const original = JSON.stringify(config);
    openMapPopup(card, config, new MaximizeConfig(true, config.title));
    const event = listener.mock.calls[0][0];
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    const action = event.detail.browser_mod;
    expect(action.service).toBe('browser_mod.popup');
    expect(action.data.browser_id).toBeUndefined();
    expect(action.data).toMatchObject({ title: 'Example', initial_style: 'wide', size: 'wide' });
    expect(action.data.content).toEqual({ ...config, type: 'custom:map-card', title: undefined, grid_options: undefined, maximize: false, card_size: 12 });
    action.data.content.entities[0].entity = 'person.other';
    expect(JSON.stringify(config)).toBe(original);
  });

  it('explains the missing dependency and does nothing when disabled', () => {
    const card = { dispatchEvent: jest.fn() };
    openMapPopup(card, {}, new MaximizeConfig(false));
    expect(card.dispatchEvent).not.toHaveBeenCalled();
    openMapPopup(card, {}, new MaximizeConfig(true));
    expect(card.dispatchEvent.mock.calls[0][0].type).toBe('hass-notification');
  });
});
