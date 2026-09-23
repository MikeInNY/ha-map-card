import { describe, it, expect, jest } from '@jest/globals';
import L from 'leaflet';
import MaximizeControl from './MaximizeControl.js';

describe('MaximizeControl', () => {
  it('provides an accessible top-right button, isolates map input, and cleans up', () => {
    const element = document.createElement('div');
    document.body.appendChild(element);
    const map = L.map(element);
    const callback = jest.fn();
    const control = new MaximizeControl(callback).addTo(map);
    const button = element.querySelector('button[aria-label="Maximize map"]');
    expect(control.getPosition()).toBe('topright');
    expect(button.type).toBe('button');
    expect(button.closest('.leaflet-top.leaflet-right')).not.toBeNull();
    const keyListener = jest.fn();
    element.addEventListener('keydown', keyListener);
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(keyListener).not.toHaveBeenCalled();
    button.click();
    expect(callback).toHaveBeenCalledTimes(1);
    control.remove();
    button.click();
    expect(callback).toHaveBeenCalledTimes(1);
    control.addTo(map);
    element.querySelector('button').click();
    expect(callback).toHaveBeenCalledTimes(2);
    map.remove();
    expect(element.querySelector('button')).toBeNull();
    element.remove();
  });
});
