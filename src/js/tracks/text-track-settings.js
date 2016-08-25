/**
 * @file text-track-settings.js
 */
import window from 'global/window';
import Component from '../component';
import * as Fn from '../utils/fn';
import * as Obj from '../utils/obj';
import log from '../utils/log';

const LOCAL_STORAGE_KEY = 'vjs-text-track-settings';

// Configuration for the various <select> elements in the DOM of this component.
//
// Possible keys include:
//
// `default`:
//   The default option index. Only needs to be provided if not zero.
// `parser`:
//   A function which is used to parse the value from the selected option in
//   a customized way.
// `selector`:
//   The selector used to find the associated <select> element.
const selectConfigs = {
  backgroundColor: {
    selector: '.vjs-bg-color > select'
  },
  backgroundOpacity: {
    selector: '.vjs-bg-opacity > select'
  },
  color: {
    selector: '.vjs-fg-color > select'
  },
  edgeStyle: {
    selector: '.vjs-edge-style > select'
  },
  fontFamily: {
    selector: '.vjs-font-family > select'
  },
  fontPercent: {
    selector: '.vjs-font-percent > select',
    default: 2,
    parser: (v) => v === '1.00' ? null : Number(v)
  },
  textOpacity: {
    selector: '.vjs-text-opacity > select'
  },
  windowColor: {
    selector: '.vjs-window-color > select'
  },
  windowOpacity: {
    selector: '.vjs-window-opacity > select'
  }
};

function captionOptionsMenuTemplate(uniqueId, dialogLabelId, dialogDescriptionId) {
  const template = `
    <div role="document">
      <div role="heading" aria-level="1" id="${dialogLabelId}" class="vjs-control-text">Captions Settings Dialog</div>
      <div id="${dialogDescriptionId}" class="vjs-control-text">Beginning of dialog window. Escape will cancel and close the window.</div>
      <div class="vjs-tracksettings">
        <div class="vjs-tracksettings-colors">
          <fieldset class="vjs-fg-color vjs-tracksetting">
            <legend>Text</legend>
            <label class="vjs-label" for="captions-foreground-color-${uniqueId}">Color</label>
            <select id="captions-foreground-color-${uniqueId}">
              <option value="#FFF" selected>White</option>
              <option value="#000">Black</option>
              <option value="#F00">Red</option>
              <option value="#0F0">Green</option>
              <option value="#00F">Blue</option>
              <option value="#FF0">Yellow</option>
              <option value="#F0F">Magenta</option>
              <option value="#0FF">Cyan</option>
            </select>
            <span class="vjs-text-opacity vjs-opacity">
              <label class="vjs-label" for="captions-foreground-opacity-${uniqueId}">Transparency</label>
              <select id="captions-foreground-opacity-${uniqueId}">
                <option value="1" selected>Opaque</option>
                <option value="0.5">Semi-Opaque</option>
              </select>
            </span>
          </fieldset>
          <fieldset class="vjs-bg-color vjs-tracksetting">
            <legend>Background</legend>
            <label class="vjs-label" for="captions-background-color-${uniqueId}">Color</label>
            <select id="captions-background-color-${uniqueId}">
              <option value="#000" selected>Black</option>
              <option value="#FFF">White</option>
              <option value="#F00">Red</option>
              <option value="#0F0">Green</option>
              <option value="#00F">Blue</option>
              <option value="#FF0">Yellow</option>
              <option value="#F0F">Magenta</option>
              <option value="#0FF">Cyan</option>
            </select>
            <span class="vjs-bg-opacity vjs-opacity">
              <label class="vjs-label" for="captions-background-opacity-${uniqueId}">Transparency</label>
              <select id="captions-background-opacity-${uniqueId}">
                <option value="1" selected>Opaque</option>
                <option value="0.5">Semi-Transparent</option>
                <option value="0">Transparent</option>
              </select>
            </span>
          </fieldset>
          <fieldset class="vjs-window-color vjs-tracksetting">
            <legend>Window</legend>
            <label class="vjs-label" for="captions-window-color-${uniqueId}">Color</label>
            <select id="captions-window-color-${uniqueId}">
              <option value="#000" selected>Black</option>
              <option value="#FFF">White</option>
              <option value="#F00">Red</option>
              <option value="#0F0">Green</option>
              <option value="#00F">Blue</option>
              <option value="#FF0">Yellow</option>
              <option value="#F0F">Magenta</option>
              <option value="#0FF">Cyan</option>
            </select>
            <span class="vjs-window-opacity vjs-opacity">
              <label class="vjs-label" for="captions-window-opacity-${uniqueId}">Transparency</label>
              <select id="captions-window-opacity-${uniqueId}">
                <option value="0" selected>Transparent</option>
                <option value="0.5">Semi-Transparent</option>
                <option value="1">Opaque</option>
              </select>
            </span>
          </fieldset>
        </div> <!-- vjs-tracksettings-colors -->
        <div class="vjs-tracksettings-font">
          <div class="vjs-font-percent vjs-tracksetting">
            <label class="vjs-label" for="captions-font-size-${uniqueId}">Font Size</label>
            <select id="captions-font-size-${uniqueId}">
              <option value="0.50">50%</option>
              <option value="0.75">75%</option>
              <option value="1.00" selected>100%</option>
              <option value="1.25">125%</option>
              <option value="1.50">150%</option>
              <option value="1.75">175%</option>
              <option value="2.00">200%</option>
              <option value="3.00">300%</option>
              <option value="4.00">400%</option>
            </select>
          </div>
          <div class="vjs-edge-style vjs-tracksetting">
            <label class="vjs-label" for="captions-edge-style-${uniqueId}">Text Edge Style</label>
            <select id="captions-edge-style-${uniqueId}">
              <option value="none" selected>None</option>
              <option value="raised">Raised</option>
              <option value="depressed">Depressed</option>
              <option value="uniform">Uniform</option>
              <option value="dropshadow">Dropshadow</option>
            </select>
          </div>
          <div class="vjs-font-family vjs-tracksetting">
            <label class="vjs-label" for="captions-font-family-${uniqueId}">Font Family</label>
            <select id="captions-font-family-${uniqueId}">
              <option value="proportionalSansSerif" selected>Proportional Sans-Serif</option>
              <option value="monospaceSansSerif">Monospace Sans-Serif</option>
              <option value="proportionalSerif">Proportional Serif</option>
              <option value="monospaceSerif">Monospace Serif</option>
              <option value="casual">Casual</option>
              <option value="script">Script</option>
              <option value="small-caps">Small Caps</option>
            </select>
          </div>
        </div> <!-- vjs-tracksettings-font -->
        <div class="vjs-tracksettings-controls">
          <button class="vjs-default-button">Defaults</button>
          <button class="vjs-done-button">Done</button>
        </div>
      </div> <!-- vjs-tracksettings -->
    </div> <!--  role="document" -->
  `;

  return template;
}

/**
 * Manipulate settings of texttracks
 *
 * @param {Object} player  Main Player
 * @param {Object=} options Object of option names and values
 * @extends Component
 * @class TextTrackSettings
 */
class TextTrackSettings extends Component {

  constructor(player, options) {
    super(player, options);
    this.hide();

    this.updateDisplay = Fn.bind(this, this.updateDisplay);

    // Grab `persistTextTrackSettings` from the player options if not passed in child options
    if (options.persistTextTrackSettings === undefined) {
      this.options_.persistTextTrackSettings = this.options_.playerOptions.persistTextTrackSettings;
    }

    this.on(this.$('.vjs-done-button'), 'click', () => {
      this.saveSettings();
      this.hide();
    });

    this.on(this.$('.vjs-default-button'), 'click', () => {
      Obj.each(selectConfigs, config => {
        this.$(config.selector).selectedIndex = config.default || 0;
      });
      this.updateDisplay();
    });

    Obj.each(selectConfigs, config => {
      this.on(this.$(config.selector), 'change', this.updateDisplay);
    });

    if (this.options_.persistTextTrackSettings) {
      this.restoreSettings();
    }
  }

  /**
   * Create the component's DOM element
   *
   * @return {Element}
   * @method createEl
   */
  createEl() {
    const uniqueId = this.id_;
    const dialogLabelId = 'TTsettingsDialogLabel-' + uniqueId;
    const dialogDescriptionId = 'TTsettingsDialogDescription-' + uniqueId;

    return super.createEl('div', {
      className: 'vjs-caption-settings vjs-modal-overlay',
      innerHTML: captionOptionsMenuTemplate(uniqueId, dialogLabelId, dialogDescriptionId),
      tabIndex: -1
    }, {
      'role': 'dialog',
      'aria-labelledby': dialogLabelId,
      'aria-describedby': dialogDescriptionId
    });
  }

  /**
   * Parses out option values.
   *
   * @private
   * @param  {String} value
   * @param  {Function} [parser]
   *         Optional function to adjust the value.
   * @return {Mixed}
   *         Will be `undefined` if no value exists (or if given value is "none").
   * @method parseOptionValue_
   */
  parseOptionValue_(value, parser) {
    if (parser) {
      value = parser(value);
    }

    if (value && value !== 'none') {
      return value;
    }
  }

  /**
   * Gets an object of text track settings (or null).
   *
   * @return {Object|null}
   * @method getValues
   */
  getValues() {
    return Obj.reduce(selectConfigs, (accum, config, key) => {
      const el = this.$(config.selector);
      let value = el.options[el.options.selectedIndex].value;

      value = this.parseOptionValue_(value, config.parser);

      if (value !== undefined) {
        accum[key] = value;
      }

      return accum;
    }, {});
  }

  /**
   * Sets text track settings from an object of values.
   *
   * @param {Object} values
   * @method setValues
   */
  setValues(values) {
    Obj.each(selectConfigs, (config, key) => {
      const value = values[key];

      if (!value) {
        return;
      }

      const el = this.$(config.selector);

      // Find the option that should be selected by comparing value(s) and
      // setting the `selectedIndex` of the <select> element if we find it.
      for (let i = 0; i < el.options.length; i++) {
        const opt = this.parseOptionValue_(el.options[i].value, config.parser);

        if (opt === value) {
          el.selectedIndex = i;
          break;
        }
      }
    });
  }

  /**
   * Restore texttrack settings
   *
   * @method restoreSettings
   */
  restoreSettings() {
    let values;

    try {
      values = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY));
    } catch (err) {
      log.warn(err);
    }

    if (values) {
      this.setValues(values);
    }
  }

  /**
   * Save texttrack settings to local storage
   *
   * @method saveSettings
   */
  saveSettings() {
    if (!this.options_.persistTextTrackSettings) {
      return;
    }

    const values = this.getValues();

    try {
      if (values) {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(values));
      } else {
        window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch (err) {
      log.warn(err);
    }
  }

  /**
   * Update display of texttrack settings
   *
   * @method updateDisplay
   */
  updateDisplay() {
    const ttDisplay = this.player_.getChild('textTrackDisplay');

    if (ttDisplay) {
      ttDisplay.updateDisplay();
    }
  }

}

Component.registerComponent('TextTrackSettings', TextTrackSettings);

export default TextTrackSettings;
