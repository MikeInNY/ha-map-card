export default class MaximizeConfig {
  constructor(config, title) {
    const options = config && typeof config === 'object' ? config : {};
    this.enabled = config === true || (!!config && typeof config === 'object' && options.enabled !== false);
    this.title = options.title ?? title ?? 'Map';
    this.popupStyle = options.popup_style ?? 'wide';
    this.cardSize = options.card_size ?? 12;
    if (!['normal', 'wide', 'fullscreen', 'classic'].includes(this.popupStyle)) {
      throw new Error('maximize.popup_style must be normal, wide, fullscreen, or classic');
    }
    if (typeof this.cardSize !== 'number' || !Number.isFinite(this.cardSize) || this.cardSize <= 0) {
      throw new Error('maximize.card_size must be a positive number');
    }
  }
}
