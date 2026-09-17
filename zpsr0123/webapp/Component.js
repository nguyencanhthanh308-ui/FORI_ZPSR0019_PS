sap.ui.define(["sap/ui/core/UIComponent", "zpsr0123/model/models"], (UIComponent, models) => {
	"use strict";

	return UIComponent.extend("zpsr0123.Component", {
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

			// import XLSX from external library
			const jJSZip = document.createElement("script");
			jJSZip.setAttribute("src", "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.1/jszip.js");
			document.head.appendChild(jJSZip);

			const jXLSX = document.createElement("script");
			jXLSX.setAttribute("src", "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.1/xlsx.js");
			document.head.appendChild(jXLSX);
		},
	});
});
