import MapConfig from "./MapConfig.js";
import L from "leaflet";
import { describe, expect, it } from "@jest/globals";

describe("MapConfig", () => {
  describe("constructor", () => {
    it("mapOptions", () => {
      const mapConfig = new MapConfig({
        x: 0.1,
        y: 0.1,
        map_options: { dragging: true },
      });

      expect(mapConfig.mapOptions.dragging).toBe(true);
    });

    it("allows disabling the default tile layer", () => {
      const mapConfig = new MapConfig({
        x: 0.1,
        y: 0.1,
        tile_layer_url: "",
      });

      expect(mapConfig.tileLayer).toBeNull();
    });

    it("normalizes simple CRS", () => {
      const mapConfig = new MapConfig({
        x: 0.1,
        y: 0.1,
        map_options: { crs: "simple", minZoom: -4 },
      });

      expect(mapConfig.mapOptions.crs).toBe(L.CRS.Simple);
      expect(mapConfig.mapOptions.minZoom).toBe(-4);
    });

    it("complains when neither a [X, Y], an entity or a focus entity is given", () => {
      expect(() =>  new MapConfig({})).toThrowError("We need a map latitude & longitude; set at least [x, y], a focus_entity or have at least 1 entities defined.");
    });

  });
});

describe('movement-follow configuration', () => {
  it('requires an explicit focus entity', () => {
    expect(() => new MapConfig({ x: 1, y: 1, focus_follow: 'refocus_on_move' }))
      .toThrow('focus_follow: refocus_on_move requires focus_entity');
  });
  it('passes the threshold and pause to the follow config', () => {
    const config = new MapConfig({ focus_entity: 'person.example', focus_follow: 'refocus_on_move',
      focus_follow_threshold: 42, focus_follow_pause: 3 });
    expect(config.focusFollow.thresholdMeters).toBe(42);
    expect(config.focusFollow.pauseMilliseconds).toBe(3000);
  });
});

describe('maximize control configuration', () => {
  const config = options => new MapConfig({ x: 0, y: 0, ...options });
  it('accepts the controls setting and keeps the top-level setting compatible', () => {
    expect(config({ controls: { maximize: true } }).maximize.enabled).toBe(true);
    expect(config({ maximize: true }).maximize.enabled).toBe(true);
    expect(config({}).maximize.enabled).toBe(false);
  });
  it('gives the controls setting precedence, including an explicit false', () => {
    expect(config({ maximize: true, controls: { maximize: false } }).maximize.enabled).toBe(false);
    expect(config({ maximize: false, controls: { maximize: true } }).maximize.enabled).toBe(true);
  });
  it('supports popup options under controls', () => {
    expect(config({ controls: { maximize: { popup_style: 'fullscreen', card_size: 15 } } }).maximize)
      .toMatchObject({ enabled: true, popupStyle: 'fullscreen', cardSize: 15 });
  });
});
