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
				Plant: [], // [プラント]
				AssemblyMonth: null, // [組立月]
				LogicModel: [], // [ロジック機種]
				MachineNo: "", // [機台NO]
				MasterSubOrder: false, // [親子指令]
				OrderType: "", // [受注区分]
				RemarksField: "", // [記事欄]
				SortOrder: 1, // [ソート順]

				recordVisibleSelected: 10,
				RowCount: "0",
				InspectionDateReflection: "",
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

		/**
		 * Model for Select Box [受注区分]
		 */
		createOrderTypeModel: function () {
			const oModel = new JSONModel([
				{
					Code: "",
					Text: "全件",
				},
				{
					Code: "S",
					Text: "新台・継足",
				},
				{
					Code: "C",
					Text: "中古機・改造・パーツ",
				},
			]);
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},

		/**
		 * Model for Select Box [記事欄]
		 */
		createRemarksFieldModel: function () {
			const oModel = new JSONModel([
				{
					Code: "",
					Text: "",
				},
				{
					Code: "X",
					Text: "未入力",
				},
			]);
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},
	};
});
