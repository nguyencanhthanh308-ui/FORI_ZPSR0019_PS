sap.ui.define(["sap/ui/model/json/JSONModel", "sap/ui/Device"], function (JSONModel, Device) {
	"use strict";

	return {
		/**
		 * Provides runtime info for the device the UI5 app is running on as JSONModel
		 */
		createDeviceModel: function () {
			const oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},

		/**
		 *  Model for ScreenModel(filters, message button..)
		 */
		createMainScreenModel: function () {
			const oModel = new JSONModel({
				InstructionNo: "",
				Customer: [],
				ShipToParty: [],
				SalesOrderNo: "",
				ProcessingType: 0,
				SalesOrganization: ["1011"],
				recordVisibleSelected: 10,
				RowCount: "0",
				InspectionDateReflection: "",
				HaveMessage: false,
				Messages: [],
				MessageCount: 0,
				MessageButtonType: "Default",
				MessageButtonIcon: "sap-icon://message-success",
			});
			oModel.setSizeLimit(10000);
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
