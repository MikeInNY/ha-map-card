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
  if (content.controls) content.controls.maximize = false;
  content.card_size = options.cardSize;
  content.fill_height = options.popupStyle === 'fullscreen';
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
        // Browser Mod's native style option supports CSS nesting in modern browsers.
        // Stretch its content area beneath the dialog header without a fixed map height.
        ...(content.fill_height ? { style: `
          --popup-padding-x: 0px;
          --popup-padding-y: 0px;
          ha-dialog, ha-adaptive-dialog {
            --popup-min-height: 100dvh !important;
            --popup-max-height: 100dvh !important;
            --dialog-surface-margin-top: 0px !important;
          }
          .content {
            height: auto !important;
            flex: 1 1 0;
            min-height: 0;
            position: relative;
          }
          .content .container {
            position: absolute;
            inset: 0;
            padding: 0 !important;
          }
          map-card { display: block; height: 100%; }
        ` } : {}),
        content
      }
    } }
  }));
}
