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
		 *  Model for ScreenModel(filters, message button..)
		 */
		createMainScreenModel: function () {
			const oModel = new JSONModel({
				// Filter
				DirectiveNo: "", // [指令No.]
				Customer: [], // [得意先]
				DeliveryDestination: [], // [納入先]
				OrderNumber: "", // [受注番号]
				ProcessingCategory: 0, // [処理区分]
				SalesDocumentType: [], // [販売伝票タイプ]
				SalesOrganization: [], // [販売組織]
				SalesOffice: [], // [営業所]
				SalesGroup: [], // [営業グループ]
				ScheduledDeliveryDate: "", // [納入予定日]
				bulkShippingDate: "", // [出荷日(一括入力用)]

				// List
				RowCount: "0",
				recordVisibleSelected: 10,

				// Message
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
		 * Model for search help
		 */
		createInitialModel: function () {
			const oModel = new JSONModel([]);
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},
	};
});
