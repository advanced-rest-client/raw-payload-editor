/**
@license
Copyright 2019 The Advanced REST client authors <arc@mulesoft.com>
Licensed under the Apache License, Version 2.0 (the "License"); you may not
use this file except in compliance with the License. You may obtain a copy of
the License at
http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
License for the specific language governing permissions and limitations under
the License.
*/
import {PolymerElement} from '@polymer/polymer/polymer-element.js';
import {IronResizableBehavior} from '@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import {html} from '@polymer/polymer/lib/utils/html-tag.js';
import {mixinBehaviors} from '@polymer/polymer/lib/legacy/class.js';
import {EventsTargetMixin} from '@advanced-rest-client/events-target-mixin/events-target-mixin.js';
import {PayloadParserMixin} from '@advanced-rest-client/payload-parser-mixin/payload-parser-mixin.js';
import '@polymer/paper-toast/paper-toast.js';
import '@polymer/paper-button/paper-button.js';
import '@advanced-rest-client/code-mirror/code-mirror.js';
import '@advanced-rest-client/code-mirror-linter/code-mirror-linter.js';
/**
 * A raw payload input editor based on CodeMirror.
 *
 * The element additionally shows Encode / Decode buttons if current content type value contains
 * "x-www-form-urlencoded".
 *
 * The element listens for `content-type-changed` custom event and updates the `contentType` property
 * automatically. This event is commonly used in ARC elements.
 *
 * ### Example
 * ```
 * <raw-payload-editor content-type="application/json"></raw-payload-editor>
 * ```
 *
 * ### Styling
 * `<raw-payload-editor>` provides the following custom properties and mixins for styling:
 *
 * Custom property | Description | Default
 * ----------------|-------------|----------
 * `--raw-payload-editor` | Mixin applied to the element | `{}`
 * `--raw-payload-editor-encode-buttons` | Mixin applied to encode / decode buttons container | `{}`
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 * @memberof UiElements
 * @polymerBehavior Polymer.IronResizableBehavior
 * @appliesMixin EventsTargetMixin
 * @appliesMixin PayloadParserMixin
 */
class RawPayloadEditor extends
  mixinBehaviors([IronResizableBehavior], PayloadParserMixin(EventsTargetMixin(PolymerElement))) {
  static get template() {
    return html`
    <style>
    :host {
      display: block;
      @apply --raw-payload-editor;
    }

    .action-buttons {
      margin: 8px 0;
      @apply --raw-payload-editor-encode-buttons;
      @apply --raw-payload-editor-action-buttons;
    }

    *[hidden] {
      display: none !important;
    }
    </style>
    <template is="dom-if" if="[[encodeEnabled]]">
      <div class="action-buttons" data-type="form">
        <paper-button on-tap="encodeValue"
          title="Encodes payload to x-www-form-urlencoded data">Encode payload</paper-button>
        <paper-button on-tap="decodeValue"
          title="Decodes payload to human readable form">Decode payload</paper-button>
      </div>
    </template>
    <template is="dom-if" if="[[isJson]]">
      <div class="action-buttons" data-type="json">
        <paper-button on-tap="formatValue" data-action="format-json"
          title="Formats JSON input.">Format JSON</paper-button>
        <paper-button on-tap="minifyValue" data-action="minify-json"
          title="Removed whitespaces from the input">Minify JSON</paper-button>
      </div>
    </template>
    <code-mirror id="cm" mode="application/json" on-value-changed="_editorValueChanged"
      on-paste="_onPaste" gutters='["CodeMirror-lint-markers"]'></code-mirror>
    <paper-toast id="invalidJsonToast">JSON value is invalid. Cannot parse value.</paper-toast>
`;
  }

  static get is() {
    return 'raw-payload-editor';
  }
  static get properties() {
    return {
      /**
       * Raw payload value
       */
      value: {
        type: String,
        notify: true,
        observer: '_valueChanged'
      },
      /**
       * Content-Type header value. Determines current code mirror mode.
       */
      contentType: {
        type: String,
        observer: '_onContentTypeChanged'
      },
      // Computed value, true if `contentType` contains `x-www-form-urlencoded`
      encodeEnabled: {
        type: Boolean,
        computed: '_computeEncodeEnabled(contentType)',
        value: false
      },
      // Computed value, true if `contentType` contains `/json`
      isJson: {
        type: Boolean,
        computed: '_computeIsJson(contentType)',
        value: false
      }
    };
  }

  constructor() {
    super();
    this._contentTypeHandler = this._contentTypeHandler.bind(this);
    this._resizeHandler = this._resizeHandler.bind(this);
  }

  _attachListeners(node) {
    node.addEventListener('content-type-changed', this._contentTypeHandler);
    this.addEventListener('iron-resize', this._resizeHandler);
  }

  _detachListeners(node) {
    node.removeEventListener('content-type-changed', this._contentTypeHandler);
    this.removeEventListener('iron-resize', this._resizeHandler);
  }

  ready() {
    super.ready();
    this.refresh();
  }

  /**
   * Forces render code-mirror content.
   * Should be used to when the element becomes visible after being hidden.
   */
  refresh() {
    this.$.cm.refresh();
  }

  /**
   * Changes CodeMirror mode when the content type value is updated.
   *
   * @param {String} ct
   */
  _onContentTypeChanged(ct) {
    this._setupLinter(ct);
    if (!ct) {
      return;
    }
    if (ct.indexOf && ct.indexOf(';') !== -1) {
      ct = ct.substr(0, ct.indexOf(';'));
    }
    this.shadowRoot.querySelector('code-mirror').mode = ct;
  }
  // Computes `encodeEnabled` based on content type.
  _computeEncodeEnabled(ct) {
    return this.__computeIs(ct, 'x-www-form-urlencoded');
  }

  _computeIsJson(ct) {
    return this.__computeIs(ct, '/json');
  }

  __computeIs(ct, needle) {
    if (!ct) {
      return false;
    }
    if (ct.indexOf && ct.indexOf(needle) !== -1) {
      return true;
    }
    return false;
  }

  /**
   * Handler for the `content-type-changed` event. Sets the `contentType` property.
   *
   * @param {CustomEvent} e
   */
  _contentTypeHandler(e) {
    const ct = e.detail.value;
    this.set('contentType', ct);
  }
  /**
   * Handler for value change.
   * If the element is opened then it will fire change event.
   *
   * @param {String} value
   */
  _valueChanged(value) {
    if (this.__editorValueChange || !this.shadowRoot) {
      return;
    }
    this.shadowRoot.querySelector('code-mirror').value = value;
  }
  /**
   * Called when the editor fires change event
   *
   * @param {CustomEvent} e
   */
  _editorValueChanged(e) {
    e.stopPropagation();
    this.__editorValueChange = true;
    this.set('value', e.detail.value);
    this.__editorValueChange = false;
  }
  /**
   * Formats JSON data on paste.
   * It only formats the input if no selection is applied, whole value
   * is selcted or input is empty.
   *
   * @param {Event} e
   */
  _onPaste(e) {
    if (this.contentType !== 'application/json') {
      return;
    }
    let len;
    if (this.value) {
      len = this.value.length;
    }
    if (this._cancelPaste(len)) {
      return;
    }

    let data = e.clipboardData.getData('text');
    try {
      data = JSON.parse(data);
      data = JSON.stringify(data, null, 2);
      e.preventDefault();
      this.set('value', data);
    } catch (e) {}
  }
  /**
   * Tests if text formatting on paste is allowed
   *
   * @param {Number} inputSize Size of current value
   * @return {Boolean} True to disallow altering the value on paste.
   */
  _cancelPaste(inputSize) {
    if (!inputSize) {
      return false;
    }
    const el = document.activeElement;
    let start = 0;
    let end = 0;
    if (el) {
      if (typeof el.selectionStart === 'number') {
        start = el.selectionStart;
      }
      if (typeof el.selectionEnd === 'number') {
        end = el.selectionEnd;
      }
    }
    if (start === 0 && end === 0) {
      const selection = window.getSelection();
      if (selection.rangeCount === 0) {
        return false;
      }
      const range = selection.getRangeAt(0);
      start = range.startOffset;
      end = range.endOffset;
    }
    if (start === 0 && end === inputSize) {
      return false;
    }
    return true;
  }

  _setupLinter(ct) {
    /* global CodeMirror */
    const editor = this.$.cm;
    if (this._computeIsJson(ct)) {
      editor.lint = CodeMirror.lint.json;
      editor.gutters = ['code-mirror-lint', 'CodeMirror-lint-markers'];
    } else {
      editor.lint = false;
      editor.gutters = ['CodeMirror-lint-markers'];
    }
    editor.refresh();
  }
  /**
   * Formats current value as it is a JSON object.
   */
  formatValue() {
    try {
      let value = this.value;
      value = JSON.parse(value);
      value = JSON.stringify(value, null, 2);
      this.set('value', value);
      this.refresh();
    } catch (e) {
      this.$.invalidJsonToast.opened = true;
      console.log(e);
    }
  }
  /**
   * Minifies JSON value by removing whitespaces.
   */
  minifyValue() {
    try {
      let value = this.value;
      value = JSON.parse(value);
      value = JSON.stringify(value);
      this.set('value', value);
      this.refresh();
    } catch (e) {
      this.$.invalidJsonToast.opened = true;
      console.log(e);
    }
  }

  _resizeHandler() {
    this.refresh();
  }

  /**
   * URL encodes payload value and resets the same value property.
   * This should be used only for payloads with x-www-form-urlencoded content-type.
   */
  encodeValue() {
    const value = this.encodeUrlEncoded(this.value);
    this.__internalChange = true;
    this.set('value', value);
    this.__internalChange = false;
  }
  /**
   * URL decodes payload value and resets the same value property.
   * This should be used only for payloads with x-www-form-urlencoded content-type.
   */
  decodeValue() {
    const value = this.decodeUrlEncoded(this.value);
    this.__internalChange = true;
    this.set('value', value);
    this.__internalChange = false;
  }
}
window.customElements.define(RawPayloadEditor.is, RawPayloadEditor);
