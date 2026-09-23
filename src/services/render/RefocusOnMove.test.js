import { describe, it, expect, jest, afterEach } from '@jest/globals';
import L from 'leaflet';
import EntitiesRenderService from './EntitiesRenderService';
import InitialViewRenderService from './InitialViewRenderService';
import MapConfig from '../../configs/MapConfig';

function fixture(options = {}) {
  const config = new MapConfig({ focus_entity: 'person.example', zoom: 15,
    focus_follow: 'refocus_on_move', ...options });
  const handlers = {};
  const map = { setView: jest.fn(), fitBounds: jest.fn(),
    getContainer: () => ({ clientWidth: 100, clientHeight: 100 }),
    on: jest.fn((event, fn) => { handlers[event] = fn; }), off: jest.fn() };
  const hass = { states: { 'person.example': { attributes: { latitude: 0, longitude: 0 } } } };
  const service = new EntitiesRenderService(map, hass, config.focusFollow, [], {}, {}, {}, false, false, config);
  service.setup();
  const initial = new InitialViewRenderService(map, config, hass, service);
  const update = async (latitude, longitude = 0) => {
    await service.render({ states: { 'person.example': { attributes: { latitude, longitude } } } });
  };
  return { config, map, service, initial, handlers, update };
}

describe('refocus_on_move', () => {
  afterEach(() => jest.useRealTimers());

  it('waits for initial layout, focuses at configured zoom, and ignores unchanged updates after a pan', async () => {
    const { service, initial, map, update } = fixture({ x: 40, y: 40 });
    await service.render();
    expect(map.setView).not.toHaveBeenCalled();
    initial.setup();
    expect(map.setView).toHaveBeenLastCalledWith(L.latLng(0, 0), 15, { animate: false });
    map.setView.mockClear(); // User pans away; entity coordinates have not changed.
    await update(0);
    await update(0);
    expect(map.setView).not.toHaveBeenCalled();
    expect(map.fitBounds).not.toHaveBeenCalled();
  });

  it('measures displacement from the last refocus, not the previous update or path length', async () => {
    const { initial, map, update } = fixture();
    initial.setup();
    await update(0.0001); // about 11 m
    await update(-0.0001); // traveled 33 m, still only 11 m displaced
    await update(0.0002); // about 22 m
    expect(map.setView).toHaveBeenCalledTimes(1);
    await update(0.0003); // about 33 m
    expect(map.setView).toHaveBeenCalledTimes(2);
    await update(0.0004);
    expect(map.setView).toHaveBeenCalledTimes(2);
    await update(0.0006);
    expect(map.setView).toHaveBeenCalledTimes(3);
  });

  it('includes the exact threshold boundary and detects longitude movement', async () => {
    const distance = L.latLng(0, 0).distanceTo(L.latLng(0, 0.001));
    const { initial, map, update } = fixture({ focus_follow_threshold: distance });
    initial.setup();
    await update(0, 0.001);
    expect(map.setView).toHaveBeenCalledTimes(2);
  });

  it('at zero threshold still requires changed coordinates', async () => {
    const { initial, map, update } = fixture({ focus_follow_threshold: 0 });
    initial.setup();
    await update(0);
    expect(map.setView).toHaveBeenCalledTimes(1);
    await update(0.000001);
    expect(map.setView).toHaveBeenCalledTimes(2);
  });

  it('uses fresh focus coordinates independently of markers and other entities', async () => {
    const { initial, service, map, update } = fixture();
    initial.setup();
    service.entities = [{ config: { focusOnFit: true, positionUpdateThreshold: 1000 },
      latLng: L.latLng(50, 50), update: jest.fn() }];
    await update(0);
    expect(map.setView).toHaveBeenCalledTimes(1);
    await update(0.001);
    expect(map.setView).toHaveBeenLastCalledWith(L.latLng(0.001, 0), 15, { animate: false });
  });

  it('retains the baseline across missing and invalid coordinates', async () => {
    const { initial, service, map, update } = fixture();
    initial.setup();
    await service.render({ states: {} });
    for (const value of [undefined, null, NaN, Infinity, 91, 'bad']) await update(value);
    expect(map.setView).toHaveBeenCalledTimes(1);
    await update(0.001);
    expect(map.setView).toHaveBeenCalledTimes(2);
  });

  it('recovers if the focused entity is missing at initial load', async () => {
    const { initial, service, map, update } = fixture();
    service.hass = { states: {} };
    initial.setup();
    expect(map.setView).not.toHaveBeenCalled();
    await update(0);
    expect(map.setView).toHaveBeenCalledTimes(1);
  });

  it('supports available subtrackers including zero coordinates', () => {
    const { initial, service, map } = fixture();
    service.hass = { states: {
      'person.example': { attributes: { device_trackers: ['missing', 'device_tracker.example'] } },
      'device_tracker.example': { attributes: { latitude: 0, longitude: 1 } }
    } };
    initial.setup();
    expect(map.setView).toHaveBeenLastCalledWith(L.latLng(0, 1), 15, { animate: false });
  });

  it.each([0, 0.0001, 0.001])('checks movement %s on pause expiry without consuming the baseline', async latitude => {
    jest.useFakeTimers();
    const { initial, service, handlers, map, update } = fixture({ focus_follow_pause: 5 });
    initial.setup();
    handlers.dragstart();
    handlers.dragend();
    await update(latitude);
    expect(map.setView).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(5000);
    expect(map.setView).toHaveBeenCalledTimes(latitude === 0.001 ? 2 : 1);
    service.cleanup();
  });

  it('ignores its own zoom events and releases the guard even without moveend', () => {
    const { initial, service, handlers, map } = fixture({ focus_follow_pause: 5 });
    map.setView.mockImplementation(() => { handlers.zoomstart(); handlers.zoomend(); });
    initial.setup();
    expect(service.isFollowPaused).toBe(false);
    expect(service._followPauseTimer).toBeNull();
    handlers.dragstart();
    expect(service.isFollowPaused).toBe(true);
    service.cleanup();
  });

  it('explicit reset uses the latest state and establishes a new baseline even while paused', async () => {
    const { initial, service, map, update } = fixture();
    initial.setup();
    service.isFollowPaused = true;
    await update(0.0002);
    initial.setup();
    expect(map.setView).toHaveBeenLastCalledWith(L.latLng(0.0002, 0), 15, { animate: false });
    service.isFollowPaused = false;
    await update(0.0003);
    expect(map.setView).toHaveBeenCalledTimes(2);
  });
});
