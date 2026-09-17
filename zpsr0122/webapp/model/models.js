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
				Plant: ["K01"], //プラント
				MachineNo: "", //機台NO
				MachineTypeGroup: [], //機種G
				OrderType: [], //受注区分
				StatusCode: [], //状況C
				TechnicalSpecification: [], //技術特殊仕様
				TechnicalSpecificationRegistrationDate: "", //技術特殊仕様登録日
				AssemblyStartDate: "", //組立開始日
				AssemblyAvailableDate: "", //組立可能日
				AssemblyMonth: "", //組立月
				recordVisibleSelected: 10,
				RowCount: "0",
				AssemblyDateReflection: "", //組立可能日
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
		 * Model for Select Box [状況C]
		 */
		createStatusCodeModel: function () {
			const oModel = new JSONModel([
				{
					Code: "A",
					Text: "未登録",
				},
				{
					Code: "B",
					Text: "登録済",
				},
				{
					Code: "C",
					Text: "承認済",
				},
			]);
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},

		/**
		 * Model for Select Box [技術特殊仕様]
		 */
		createTechnicalSpecificationModel: function () {
			const oModel = new JSONModel([
				{
					Code: "",
					Text: "無",
				},
				{
					Code: "X",
					Text: "有",
				},
			]);
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},

		/**
		 * Model for Select Box [組立開始日]
		 */
		createAssemblyStartDateModel: function () {
			const oModel = new JSONModel([
				{
					Code: "",
					Text: "",
				},
				{
					Code: "1",
					Text: "登録済",
				},
				{
					Code: "2",
					Text: "未登録",
				},
			]);
			oModel.setDefaultBindingMode("TwoWay");
			return oModel;
		},

		/**
		 * Model for Select Box [組立可能日]
		 */
		createAssemblyAvailableDateModel: function () {
			const oModel = new JSONModel([
				{
					Code: "",
					Text: "",
				},
				{
					Code: "1",
					Text: "登録済",
				},
				{
					Code: "2",
					Text: "未登録",
				},
			]);
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
