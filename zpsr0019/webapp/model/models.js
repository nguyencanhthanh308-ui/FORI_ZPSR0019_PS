sap.ui.define(
	["sap/ui/model/json/JSONModel", "sap/ui/Device"],
	/**
	 * provide app-view type models (as in the first "V" in MVVC)
	 *
	 * @param {typeof sap.ui.model.json.JSONModel} JSONModel
	 * @param {typeof sap.ui.Device} Device
	 *
	 * @returns {Function} createDeviceModel() for providing runtime info for the device the UI5 app is running on
	 */
	function (JSONModel, Device) {
		"use strict";

		return {
			createDeviceModel: function () {
				const oModel = new JSONModel(Device);
				oModel.setDefaultBindingMode("OneWay");
				return oModel;
			},
			/**
			 *  Model for MainScreenModel
			 */
			createMainScreenModel: function () {
				const oModel = new JSONModel({
					MachineNo: "",
					AssemblyGroup: "",
					OutboundTask: "",
					RequestNo: "",
					ItemCode: "",
					Plant: "K01",
					DrawingNo: "",
					Destination: "",
					RequiredDate: null,
					// RequiredDateFrom: null,
					// RequiredDateTo: null,
					IssueInstructionStatus: null,
					ActualGoodsIssueNo: "",
					StorageLocation: "",
					PL: "",
					ParentPartNo: "",
					ProcessNo: "",
					IssueCompletionFlag: "",
					PurchaseRequisitionType: "",
					AssemblyPlanningStatus: [], // [組計状況]
					// validate
					RequirementFrom: null,
					RequirementTo: null,
					RequirementValue: null,
					RowCount: "0",
					recordVisibleSelected: 10,
					// totalRecord: 0,
					HaveMessage: false,
					Messages: [],
					MessageCount: 0,
					bEditable: true,
					bCheckAll: false,

					selectAssemblyGroup: false,
					selectPurchaseRequisitionType: false,
					selectRequiredDate: false,
					selectOutboundTask: false,
					selectDestination: false,
					selectStorageLocation: false,
					selectBackflush: false, // [バックフラッシュ] was missing from 一括反映 fields
				});
				oModel.setSizeLimit(10000);
				oModel.setDefaultBindingMode("TwoWay");
				return oModel;
			},

			/**
			 *  Model for dropdown lists
			 */
			createDropdownModel: function () {
				const oModel = new JSONModel({
					RecordVisible: [
						{
							key: 1,
							value: 1,
						},
						{
							key: 5,
							value: 5,
						},
						{
							key: 10,
							value: 10,
						},
						{
							key: 20,
							value: 20,
						},
						{
							key: 50,
							value: 50,
						},
						{
							key: 100,
							value: 100,
						},
					],
				});
				oModel.setDefaultBindingMode("OneWay");
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

			// /**
			//  *  Model for search help
			//  * 4 valuehelp, 2 pulldown
			//  */
			// createSearchHelpModel: function () {
			// 	const oModel = new JSONModel({
			// 		Mat0mSet: [],
			// 		SearchHelpPlantSet: [],
			// 		SearchHelpUnitSet: [],
			// 		SearchHelpPurTypeSet: [],
			// 		SearchHelpSkoJoukyouSet: [],
			// 		SearchHelpStgLocationSet: [],
			// 		SearchHelpTaskCodeSet: [],
			// 		SuggestForBdterSet: [],
			// 		SuggestForPurTypeSet: [],
			// 		IssueInstructionStatus: [
			// 			{ Code: "", Text: "" },
			// 			{ Code: "Y", Text: "未" },
			// 			{ Code: "X", Text: "済" },
			// 		],
			// 		GoodsIssueCompletionFlag: [
			// 			{ Code: "", Text: "" },
			// 			{ Code: "Y", Text: "未" },
			// 			{ Code: "X", Text: "済" },
			// 		],
			// 	});
			// 	oModel.setDefaultBindingMode("OneWay");
			// 	return oModel;
			// },

			/** [出庫指示状況] */
			createIssueInstructionStatusModel: function () {
				return new JSONModel([
					{ Code: "",  Text: "" },
					{ Code: "Y", Text: "未" },
					{ Code: "X", Text: "済" },
				]);
			},

			/** [出庫完了フラグ] */
			createIssueCompletionFlagModel: function () {
				return new JSONModel([
					{ Code: "",  Text: "" },
					{ Code: "Y", Text: "未" },
					{ Code: "X", Text: "済" },
				]);
			},
		};
	}
);
