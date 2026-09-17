sap.ui.loader.config({
	paths: {
		"zpsr0113/libs/xlsx": "https://unpkg.com/dep-xlsx-js-style@1.2.7/dist/xlsx.min",
	},
	shim: {
		"zpsr0113/libs/xlsx": {
			amd: true,
			exports: "XLSX",
		},
	},
	async: true,
});

sap.ui.define(["sap/ui/core/UIComponent", "zpsr0113/model/models"], (UIComponent, models) => {
	"use strict";

	return UIComponent.extend("zpsr0113.Component", {
		metadata: {
			manifest: "json",
			interfaces: ["sap.ui.core.IAsyncContentCreation"],
			config: {
				fullWidth: true,
			},
		},

		init() {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// set the device model
			this.setModel(models.createDeviceModel(), "device");

			// enable routing
			this.getRouter().initialize();
		},
	});
});
