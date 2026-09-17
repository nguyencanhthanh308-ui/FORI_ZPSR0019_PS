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
					Inkidaino001: "",
					Insortl001: "",
					Intaskcode001: "",
					Inusr02001: "",
					Inmatnr001: "",
					Inwerks001: "",
					Inzuban001: "",
					Inshukkosaki001: "",
					Inbdter001: null,
					Inbdter001From: null,
					Inbdter001To: null,
					Inshukkojoukyou001: null,
					Injitsushukkono001: "",
					Ingort001: "",
					Inplno001: "",
					Inoyahinban001: "",
					Inshorino001: "",
					Inkzear001: "",
					Inbdmng001: "",
					Inznw3status: [], // [組計状況] - No.1527
					// validate
					RequirementFrom: null,
					RequirementTo: null,
					RequirementValue: null,
					RowCount: 0,
					recordVisibleSelected: 10,
					totalRecord: 0,
					recordVisibleMin: 1,
					recordVisibleMax: 50,
					HaveMessage: false,
					Messages: [],
					MessageCount: 0,
					bEditable: true,
					bCheckAll: false,
					// no1641
					selectSORTL003: false,
					selectBDMNG004: false,
					selectBDTER003: false,
					selectZ_TASK_CODE003: false,
					selectZ_SHUKKOSAKI003: false,
					selectLGORT003: false,
				});
				oModel.setSizeLimit(10000); // No.2204
				oModel.setDefaultBindingMode("TwoWay");
				return oModel;
			},

			/**
			 *  Model for ReportListModel
			 */
			createReportListModel: function () {
				const oModel = new JSONModel([]);
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

			//   /**
			//    *  Model for search help
			//    */
			//   createSearchHelpModel: function () {
			//     const oModel = new JSONModel({
			//       LGORT: [],
			//       JOUKYOU: [],
			//       MATNR: [],
			//       WERKS: [],
			//       MEINS: [],
			//       BDMNG: [],
			//     });
			//     oModel.setDefaultBindingMode("OneWay");
			//     return oModel;
			//   },

			/**
			 *  Model for search help
			 * 4 valuehelp, 2 pulldown
			 */
			createSearchHelpModel: function () {
				const oModel = new JSONModel({
					Mat0mSet: [],
					SearchHelpPlantSet: [],
					SearchHelpUnitSet: [],
					SearchHelpPurTypeSet: [],
					SearchHelpSkoJoukyouSet: [],
					SearchHelpStgLocationSet: [],
					SearchHelpTaskCodeSet: [],
					SuggestForBdterSet: [],
					SuggestForPurTypeSet: [],
					DeliveryInstructionStatus: [
						{ Code: "", Text: "" },
						{ Code: "Y", Text: "未" },
						{ Code: "X", Text: "済" },
					],
					GoodsIssueCompleteStatus: [
						{ Code: "", Text: "" },
						{ Code: "Y", Text: "未" },
						{ Code: "X", Text: "済" },
					],
				});
				oModel.setDefaultBindingMode("OneWay");
				return oModel;
			},
		};
	}
);
