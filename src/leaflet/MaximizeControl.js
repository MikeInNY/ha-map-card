import L from 'leaflet';

export default class MaximizeControl extends L.Control {
  constructor(onMaximize) {
    super({ position: 'topright' });
    this.onMaximize = onMaximize;
  }

  onAdd() {
    const container = L.DomUtil.create('div', 'leaflet-bar map-card-maximize');
    this.button = L.DomUtil.create('button', '', container);
    this.button.type = 'button';
    this.button.title = 'Maximize map';
    this.button.setAttribute('aria-label', 'Maximize map');
    this.button.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    L.DomEvent.on(container, 'keydown keyup', L.DomEvent.stopPropagation);
    L.DomEvent.on(this.button, 'click', this._click, this);
    return container;
  }

  _click(event) {
    L.DomEvent.stop(event);
    this.onMaximize();
  }

  onRemove() {
    L.DomEvent.off(this.button, 'click', this._click, this);
  }
}
