import FocusFollowConfig from "./FocusFollowConfig";

import { describe, expect, it } from "@jest/globals";

describe('FocusFollowConfig', () => {

  describe('constructor', () => {
    it('should initialize with a wrong config', () => {
      const config = "auto";
      const focusFollowConfig = new FocusFollowConfig(config);

      expect(focusFollowConfig.isNone).toBe(true);
      expect(focusFollowConfig.isContains).toBe(false);
      expect(focusFollowConfig.isRefocus).toBe(false);
    });

    it('should initialize with none config', () => {
      const config = "none";
      const focusFollowConfig = new FocusFollowConfig(config);

      expect(focusFollowConfig.isNone).toBe(true);
      expect(focusFollowConfig.isContains).toBe(false);
      expect(focusFollowConfig.isRefocus).toBe(false);
    });

    it('should initialize with an empty config', () => {
      const config = null;
      const focusFollowConfig = new FocusFollowConfig(config);

      expect(focusFollowConfig.isNone).toBe(true);
      expect(focusFollowConfig.isContains).toBe(false);
      expect(focusFollowConfig.isRefocus).toBe(false);
    });

    it('should initialize with contains config', () => {
      const config = "contains";
      const focusFollowConfig = new FocusFollowConfig(config);

      expect(focusFollowConfig.isNone).toBe(false);
      expect(focusFollowConfig.isContains).toBe(true);
      expect(focusFollowConfig.isRefocus).toBe(false);
    });

    it('should initialize with refocus config', () => {
      const config = "refocus";
      const focusFollowConfig = new FocusFollowConfig(config);

      expect(focusFollowConfig.isNone).toBe(false);
      expect(focusFollowConfig.isContains).toBe(false);
      expect(focusFollowConfig.isRefocus).toBe(true);
    });


  });

  describe('pause', () => {
    it('should default to no pause when not provided', () => {
      const focusFollowConfig = new FocusFollowConfig("refocus");

      expect(focusFollowConfig.hasPause).toBe(false);
      expect(focusFollowConfig.pauseMilliseconds).toBe(0);
    });

    it('should default to no pause with an explicit 0', () => {
      const focusFollowConfig = new FocusFollowConfig("refocus", 0);

      expect(focusFollowConfig.hasPause).toBe(false);
      expect(focusFollowConfig.pauseMilliseconds).toBe(0);
    });

    it('should default to no pause with a negative number', () => {
      const focusFollowConfig = new FocusFollowConfig("refocus", -5);

      expect(focusFollowConfig.hasPause).toBe(false);
      expect(focusFollowConfig.pauseMilliseconds).toBe(0);
    });

    it('should default to no pause with a non-numeric string', () => {
      const focusFollowConfig = new FocusFollowConfig("refocus", "abc");

      expect(focusFollowConfig.hasPause).toBe(false);
      expect(focusFollowConfig.pauseMilliseconds).toBe(0);
    });

    it('should accept a numeric string for template-provided values', () => {
      const focusFollowConfig = new FocusFollowConfig("refocus", "5");

      expect(focusFollowConfig.hasPause).toBe(true);
      expect(focusFollowConfig.pauseMilliseconds).toBe(5000);
    });

    it('should store a valid pause duration in seconds and expose it in milliseconds', () => {
      const focusFollowConfig = new FocusFollowConfig("refocus", 5);

      expect(focusFollowConfig.hasPause).toBe(true);
      expect(focusFollowConfig.pauseMilliseconds).toBe(5000);
    });
  });
});
describe('movement threshold', () => {
  it.each([undefined, null, '', 'invalid', -1, Infinity, NaN])('defaults invalid or absent threshold %s to 25 meters', value => {
    expect(new FocusFollowConfig('refocus_on_move', 0, value).thresholdMeters).toBe(25);
  });
  it.each([0, 25, 12.5, '50'])('accepts threshold %s', value => {
    const config = new FocusFollowConfig('refocus_on_move', 5, value);
    expect(config.thresholdMeters).toBe(Number(value));
    expect(config.isRefocusOnMove).toBe(true);
    expect(config.isRefocus).toBe(false);
    expect(config.isContains).toBe(false);
    expect(config.isNone).toBe(false);
    expect(config.pauseMilliseconds).toBe(5000);
  });
});
