// Browser Mod handles ll-custom locally; omitting browser_id avoids a server call.
/**
 * Open an independent map copy in the current browser.
 * @param {HTMLElement} card Event source.
 * @param {object} config Raw card configuration.
 * @param {object} options Normalized maximize options.
 */
export function openMapPopup(card, config, options) {
  if (!options.enabled) return;
  if (!window.browser_mod) {
    card.dispatchEvent(new CustomEvent('hass-notification', {
      bubbles: true, composed: true,
      detail: { message: 'Install Browser Mod and reload this browser to maximize the map.' }
    }));
    return;
  }
  const content = JSON.parse(JSON.stringify(config));
  content.type = 'custom:map-card';
  content.maximize = false;
  content.card_size = options.cardSize;
  delete content.title;
  delete content.grid_options;
  delete content.layout_options;
  delete content.view_layout;
  card.dispatchEvent(new CustomEvent('ll-custom', {
    bubbles: true, composed: true,
    detail: { browser_mod: {
      service: 'browser_mod.popup',
      data: {
        title: options.title,
        initial_style: options.popupStyle,
        size: options.popupStyle,
        content
      }
    } }
  }));
}
