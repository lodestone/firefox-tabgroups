const self = require("sdk/self");
const _ = require("sdk/l10n").get;

const {Hotkey} = require("sdk/hotkeys");
const {Panel} = require("sdk/panel");
const Prefs = require("sdk/simple-prefs");
const {ToggleButton} = require("sdk/ui/button/toggle");
const WindowUtils = require("sdk/window/utils");

const Utils = require("lib/utils");
const {SessionStorage} = require("lib/storage/session");
const {TabManager} = require("lib/tabmanager");

function TabGroups() {
  this._groupsPanel = null;
  this._hotkey = null;
  this._panelButton = null;

  this._tabs = new TabManager(new SessionStorage());

  this.init();
  this.bindEvents();
}

TabGroups.prototype = {
  init: function() {
    this.createPanelButton();
    this.createGroupsPanel();
    this.createHotkey();
  },

  bindEvents: function() {
    this.bindHotkeyPreference();
    this.bindPanelButtonEvents();
    this.bindPanelEvents();
  },

  createGroupsPanel: function() {
    this._groupsPanel = Panel({
      height: 1,
      contentURL: self.data.url("groupspanel.html"),
      contentScriptOptions: {
        l10n: Utils.getL10nStrings([
          "unnamed_group"
        ])
      }
    });
  },

  createPanelButton: function() {
    this._panelButton = ToggleButton({
      id: "tabgroups-show",
      icon: {
        "16": Utils.themeSwitch({
          dark: self.data.url("assets/images/icon-inverted-32.png"),
          light: self.data.url("assets/images/icon-32.png")
        }),
        "32": self.data.url("assets/images/icon-32.png"),
        "64": self.data.url("assets/images/icon-64.png")
      },
      label: _("panelButton_label")
    });
  },

  createHotkey: function() {
    if (!Prefs.prefs.bindPanoramaShortcut) {
      return;
    }

    this._hotkey = Hotkey({
      combo: "accel-shift-e",
      onPress: () => {
        if (this._groupsPanel.isShowing) {
          this._groupsPanel.hide();
        } else {
          this._groupsPanel.show({position: this._panelButton});
          this._panelButton.state("window", {checked: true});
        }
      }
    });
  },

  bindHotkeyPreference: function() {
    if (Prefs.prefs.bindPanoramaShortcut) {
      this.createHotkey();
    }

    Prefs.on("bindPanoramaShortcut", () => {
      if (Prefs.prefs.bindPanoramaShortcut) {
        if (!this._hotkey) {
          this.createHotkey();
        }
      } else if (this._hotkey) {
        this._hotkey.destroy();
        this._hotkey = null;
      }
    });
  },

  bindPanelButtonEvents: function() {
    this._panelButton.on("change", (state) => {
      if (!state.checked) {
        this._groupsPanel.hide();
      } else {
        if (this._groupsPanel.isShowing) {
          this._groupsPanel.hide();
        }

        this._groupsPanel.show({position: this._panelButton});
      }
    });
  },

  bindPanelEvents: function() {
    this._groupsPanel.on("hide", () => {
      this._panelButton.state("window", {checked: false});
    });

    this._groupsPanel.on("show", () => {
      let currentWindow = WindowUtils.getMostRecentBrowserWindow();
      let groups = this._tabs.getGroupsWithTabs(currentWindow);

      this._groupsPanel.port.emit("TabgroupsChanged", groups);
    });

    this._groupsPanel.port.on("ResizePanel", (size) => {
      this._groupsPanel.resize(
        this._groupsPanel.width,
        size.height + 18
      );
    });
  }
};

new TabGroups();
