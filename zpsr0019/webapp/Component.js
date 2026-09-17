/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */
/**
 * Loading config xlsx unpackage.
 */
sap.ui.loader.config({
	paths: {
		"zpsr0009/libs/xlsx": "https://unpkg.com/dep-xlsx-js-style@1.2.7/dist/xlsx.min",
	},
	shim: {
		"zpsr0009/libs/xlsx": {
			amd: true,
			exports: "XLSX",
		},
	},
	async: true,
});

sap.ui.define(
	["sap/ui/core/UIComponent", "sap/ui/Device", "zpsr0009/model/models"],
	function (UIComponent, Device, models) {
		"use strict";

		return UIComponent.extend("zpsr0009.Component", {
			metadata: {
				manifest: "json",
				config: {
					fullWidth: true,
				},
			},

			/**
			 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
			 * @public
			 * @override
			 */
			init: function () {
				// call the base component's init function
				UIComponent.prototype.init.apply(this, arguments);

				// enable routing
				this.getRouter().initialize();

				// set the device model
				this.setModel(models.createDeviceModel(), "device");
			},
		});
	}
);
