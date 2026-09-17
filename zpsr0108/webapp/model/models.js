sap.ui.define(["sap/ui/model/json/JSONModel", "sap/ui/Device"], function (JSONModel, Device) {
	"use strict";

	return {
		/**
		 * Provides runtime information for the device the UI5 app is running on as a JSONModel.
		 * @returns {sap.ui.model.json.JSONModel} The device model.
		 */
		createDeviceModel: function () {
			const oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},

		/**
		 *  Model for ScreenModel (filters, message button..)
		 */
		createMainScreenModel: function () {
			const oModel = new JSONModel({
				AssemblyMonth: null, // [組立月]
				WC: [], // [WC]
				Plant: ["K01"], // [プラント]
				Incomplete: 0, // [未完]

				recordVisibleSelected: 10,
				RowCount: "0",
				HaveMessage: false,
				Messages: [],
				MessageCount: 0,
				MessageButtonType: "Default",
				MessageButtonIcon: "sap-icon://message-success",
			});
			oModel.setSizeLimit(10000); // No.2204
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},

		/**
		 *  Model for ScreenModel(filters, message button..)
		 */
		createInitialModel: function () {
			const oModel = new JSONModel([]);
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},
	};
});
