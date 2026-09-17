sap.ui.define(
	[
		"sap/base/util/UriParameters",
		"sap/ui/core/mvc/Controller",
		"sap/ui/core/BusyIndicator",
		"sap/ui/core/ValueState",
		"sap/ui/core/Fragment",
		"sap/ui/model/FilterOperator",
		"sap/ui/model/json/JSONModel",
		"sap/ui/model/Filter",
		"sap/base/util/deepExtend",
		"sap/m/MessageBox",
		"zpsr0019/model/models",
		"zpsr0019/utils/common",
		"zpsr0019/utils/constant",		
		"zpsr0019/libs/xlsx",                     
		"zpsr0019/handler/controlHandler/p13nDialogPopup",
		"zpsr0019/handler/controlHandler/bookmark",
		"zpsr0019/handler/controlHandler/variant",
		"zpsr0019/handler/controlHandler/excel",
		"zpsr0019/handler/debounce/debounce",
		"zpsr0019/handler/errorHandler/ErrorHandler",
		"zpsr0019/handler/formatter/formatter",
		"zpsr0019/handler/helper/Validator",
		"zpsr0019/handler/helper/Message"         
	],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (
		UriParameters,
		Controller,
		BusyIndicator,
		ValueState,
		Fragment,
		FilterOperator,
		JSONModel,
		Filter,
		deepExtend,
		MessageBox,
		models,
		common,
		Constants,
		XLSX,
		p13nDialogPopup,
		Bookmark,
		variant,
		excel,
		Debounce,
		ErrorHandler,
		Formatter,
		Validator,
		Message,
	) {
		"use strict";

		return Controller.extend("zpsr0019.controller.Main", {
			aDeleteList: [],

			onInit: async function () {
				// Initialize Data Model
				this._initDataModel();

				// Get all data for pull down and search help
				this._getDataInitialModel();

				// const oStartupParameters = this._getMyComponent().getComponentData().startupParameters;
				// const sIdVariant = oStartupParameters["variant-id"] ? oStartupParameters["variant-id"][0] : null;
				
				// Service variants
				await this._connectPersonalizationService();
				
				// Bookmark
				Bookmark.initialBookmark.apply(this, [`/${Constants.MAIN_PATH}/$count`, ["filterbar"]]);
				
				// Transfer URL parameter to filter value
				this._handleSetValueParamToFilter();
			},

			/**
			 *  Initialize Data Model
			 */			
			_initDataModel: function () {
				const oView = this.getView();
                // Model for i18n
				this.oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
				oView.setModel(this._getOdataModel());
				// Screen model
				oView.setModel(models.createMainScreenModel(), "screen");
				// OdataTable model
				this.getView().setModel(models.createInitialModel(), "oDataTable");

				oView.setModel(models.createInitialModel(), "PlantModel");
				oView.setModel(models.createInitialModel(), "StorageLocationModel");
				oView.setModel(models.createInitialModel(), "PurchaseReqTypeModel");
				oView.setModel(models.createInitialModel(), "UnitModel");
				oView.setModel(models.createInitialModel(), "AssemblyStatusModel");
				oView.setModel(models.createInitialModel(), "TaskCodeModel");
				oView.setModel(models.createIssueInstructionStatusModel(), "IssueInstructionStatusModel");
				oView.setModel(models.createIssueCompletionFlagModel(), "IssueCompletionFlagModel");

				// Add event press for DateRangeSelection
				let oItem = this.byId("BDTER");
				oItem.addEventDelegate(
					{
						onkeydown: function (oEvent) {
							if (oEvent.key === "Enter") {
								this.onPressSearchButton();
							}
						},
					},
					this
				);
			},

			/**
			 * Handle get all data for pull down and search help
			 */
			_getDataInitialModel: function () {
				BusyIndicator.show(0);
				const promises = [
						// [プラント]
						this._readOData([], "SearchHelpPlantSet").then((oData) => {
							this._setModelByName(oData, "PlantModel");
						}),

						// [保管場所]
						this._readOData([], "SearchHelpStgLocationSet").then((oData) => {
							oData.results.unshift({ Werks: "", Lgort: "", Name1: "" });
							this._setModelByName(oData, "StorageLocationModel");
						}),

						// [購買依頼タイプ]
						this._readOData([], "SearchHelpPurTypeSet").then((oData) => {
							oData.results.unshift({ Code: "", Text: "" });
							this._setModelByName(oData, "PurchaseReqTypeModel");
						}),

						// [入力単位]
						this._readOData([], "SearchHelpUnitSet").then((oData) => {
							this._setModelByName(oData, "UnitModel");
						}),

						// [組計状況]
						this._readOData([], "SearchHelp_TXT30Set").then((oData) => {
							const aSorted = this._sortAssemblyStatusSearchHelp(oData.results || []);
							this._setModelByName({ results: aSorted }, "AssemblyStatusModel");
						}),			
					];

				Promise.all(promises)
					.then(() =>{ 
						BusyIndicator.hide();

						const aMock = [
							{
								index: 1, operation: "", selected: false, Outunchangeflg001: false,
								OUTZ_KIDAI_NO: "73400F101 100", OUTSORTL: "F1010001", OUTUSR02: "GT100",
								OUTTXT30: "確定", OUTMATNR: "GW01133061", OUTWERKS: "V01",
								OUTMAKTX: "COVER", OUTKOUBAI_IRAI_TYPE: "8", OUTKOUBAI_IRAI_TYPEvalue: "8",
								OUTERFMG: "1", OUTERFME: "PC", OUTBDMNG: "1.000", OUTMEINS: "PC",
								OUTHIKIATESUYO: "1.000", OUTENMNG: "0.000", OUTBDTER: "2024/02/14",
								OUTKZMPF: "X", OUTLGORT: "FB", OUTLGORTvalue: "FB", OUTRGEKZ: false,
								OUTZ_TASK_CODE: "F1010001", OUTZ_SHUKKOSAKI: "C71", OUTZ_ZUBAN: "WJ275000003",
								OUTZ_JITSUSHUKKO_NO: "S00101", OUTZ_SHUKKO_JOUKYOU: "", OUTKZEAR: "未",
								OUTZ_POSITION_NO: "POS-0001", OUTZ_PLNO: "WJ02750010", OUTZ_OYA_HINBAN: "WJ02750010",
								OUTZ_HOJO_HINBAN: "001", OUTZ_SHORI_NO: "G057432",
								OUTRSNUM: "0000024949", OUTRSPOS: "0241", OUTPOSNR: "0239",OUTGYOKUBUN: "N",   // 通常行
							},
							{
								index: 2, operation: "", selected: false, Outunchangeflg001: false,
								OUTZ_KIDAI_NO: "73400F101 100", OUTSORTL: "F1010002", OUTUSR02: "GT101",
								OUTTXT30: "確定", OUTMATNR: "GW01133061", OUTWERKS: "V01",
								OUTMAKTX: "COVER", OUTKOUBAI_IRAI_TYPE: "3", OUTKOUBAI_IRAI_TYPEvalue: "3",
								OUTERFMG: "1", OUTERFME: "PC", OUTBDMNG: "1.000", OUTMEINS: "PC",
								OUTHIKIATESUYO: "1.000", OUTENMNG: "0.000", OUTBDTER: "2024/02/14",
								OUTKZMPF: "X", OUTLGORT: "Q2", OUTLGORTvalue: "Q2", OUTRGEKZ: true,
								OUTZ_TASK_CODE: "F1010002", OUTZ_SHUKKOSAKI: "C71", OUTZ_ZUBAN: "WJ275000003",
								OUTZ_JITSUSHUKKO_NO: "S00102", OUTZ_SHUKKO_JOUKYOU: "X", OUTKZEAR: "未",
								OUTZ_POSITION_NO: "POS-0002", OUTZ_PLNO: "WJ02750010", OUTZ_OYA_HINBAN: "WJ02750010",
								OUTZ_HOJO_HINBAN: "002", OUTZ_SHORI_NO: "G057433",
								OUTRSNUM: "0000024949", OUTRSPOS: "0702", OUTPOSNR: "000Z1",OUTGYOKUBUN: "N",   // 通常行
							},
							{
								// test 表示行
								index: 3, operation: "", selected: false, Outunchangeflg001: true,
								OUTZ_KIDAI_NO: "73400F101 200", OUTSORTL: "F1010003", OUTUSR02: "GT102",
								OUTTXT30: "確定", OUTMATNR: "GW01134461", OUTWERKS: "V01",
								OUTMAKTX: "NAMEPLATE", OUTKOUBAI_IRAI_TYPE: "8", OUTKOUBAI_IRAI_TYPEvalue: "8",
								OUTERFMG: "1", OUTERFME: "PC", OUTBDMNG: "1.000", OUTMEINS: "PC",
								OUTHIKIATESUYO: "1.000", OUTENMNG: "0.000", OUTBDTER: "2024/02/15",
								OUTKZMPF: "X", OUTLGORT: "FB", OUTLGORTvalue: "FB", OUTRGEKZ: false,
								OUTZ_TASK_CODE: "F1010003", OUTZ_SHUKKOSAKI: "C72", OUTZ_ZUBAN: "WJ275000004",
								OUTZ_JITSUSHUKKO_NO: "S00103", OUTZ_SHUKKO_JOUKYOU: "", OUTKZEAR: "未",
								OUTZ_POSITION_NO: "POS-0003", OUTZ_PLNO: "WJ02750011", OUTZ_OYA_HINBAN: "WJ02750011",
								OUTZ_HOJO_HINBAN: "001", OUTZ_SHORI_NO: "G057434",
								OUTRSNUM: "0000024950", OUTRSPOS: "0242", OUTPOSNR: "0240",OUTGYOKUBUN: "R",   // 表示行
							},
							{
								// 引落数量 > 0 — 購買依頼タイプ 
								index: 4, operation: "", selected: false, Outunchangeflg001: false,
								OUTZ_KIDAI_NO: "73400F101 200", OUTSORTL: "F1010004", OUTUSR02: "GT103",
								OUTTXT30: "確定", OUTMATNR: "GW01306261", OUTWERKS: "V01",
								OUTMAKTX: "BEARING", OUTKOUBAI_IRAI_TYPE: "8", OUTKOUBAI_IRAI_TYPEvalue: "8",
								OUTERFMG: "2", OUTERFME: "PC", OUTBDMNG: "2.000", OUTMEINS: "PC",
								OUTHIKIATESUYO: "1.000", OUTENMNG: "1.000", OUTBDTER: "2024/02/16",
								OUTKZMPF: "X", OUTLGORT: "Q2", OUTLGORTvalue: "Q2", OUTRGEKZ: true,
								OUTZ_TASK_CODE: "F1010004", OUTZ_SHUKKOSAKI: "C72", OUTZ_ZUBAN: "WJ221000005",
								OUTZ_JITSUSHUKKO_NO: "S00104", OUTZ_SHUKKO_JOUKYOU: "", OUTKZEAR: "未",
								OUTZ_POSITION_NO: "POS-0004", OUTZ_PLNO: "WJ02210010", OUTZ_OYA_HINBAN: "WJ02210010",
								OUTZ_HOJO_HINBAN: "001", OUTZ_SHORI_NO: "G057435",
								OUTRSNUM: "0000024951", OUTRSPOS: "0542", OUTPOSNR: "0540",OUTGYOKUBUN: "N",   // 通常行
							},
							{
								// 出庫完了 = 済
								index: 5, operation: "", selected: false, Outunchangeflg001: false,
								OUTZ_KIDAI_NO: "73400F101 300", OUTSORTL: "F1010005", OUTUSR02: "GT104",
								OUTTXT30: "完了", OUTMATNR: "GW01315061", OUTWERKS: "V01",
								OUTMAKTX: "STUD BOLT", OUTKOUBAI_IRAI_TYPE: "3", OUTKOUBAI_IRAI_TYPEvalue: "3",
								OUTERFMG: "3", OUTERFME: "PC", OUTBDMNG: "3.000", OUTMEINS: "PC",
								OUTHIKIATESUYO: "3.000", OUTENMNG: "10.000", OUTBDTER: "2024/02/17",
								OUTKZMPF: "X", OUTLGORT: "FB", OUTLGORTvalue: "FB", OUTRGEKZ: true,
								OUTZ_TASK_CODE: "F1010005", OUTZ_SHUKKOSAKI: "C73", OUTZ_ZUBAN: "WJ261000003",
								OUTZ_JITSUSHUKKO_NO: "S00105", OUTZ_SHUKKO_JOUKYOU: "X", OUTKZEAR: "済",
								OUTZ_POSITION_NO: "POS-0005", OUTZ_PLNO: "WJ02610010", OUTZ_OYA_HINBAN: "WJ02610010",
								OUTZ_HOJO_HINBAN: "003", OUTZ_SHORI_NO: "G057436",
								OUTRSNUM: "0000024952", OUTRSPOS: "0545", OUTPOSNR: "0543",OUTGYOKUBUN: "N",   // 通常行
							},
							{
								index: 6, operation: "I", selected: true, insert: true, Outunchangeflg001: false,
								OUTZ_KIDAI_NO: "73400F101 400", OUTSORTL: "F1010006", OUTUSR02: "GT105",
								OUTTXT30: "確定", OUTMATNR: "GW01609061", OUTWERKS: "V01",
								OUTMAKTX: "COLLAR/CHAIN", OUTKOUBAI_IRAI_TYPE: "8", OUTKOUBAI_IRAI_TYPEvalue: "8",
								OUTERFMG: "2", OUTERFME: "PC", OUTBDMNG: "2.000", OUTMEINS: "PC",
								OUTHIKIATESUYO: "0.000", OUTENMNG: "0.000", OUTBDTER: "2024/02/18",
								OUTKZMPF: "X", OUTLGORT: "Q2", OUTLGORTvalue: "Q2", OUTRGEKZ: false,
								OUTZ_TASK_CODE: "F1010006", OUTZ_SHUKKOSAKI: "C74", OUTZ_ZUBAN: "WJ241000007",
								OUTZ_JITSUSHUKKO_NO: "S00106", OUTZ_SHUKKO_JOUKYOU: "", OUTKZEAR: "未",
								OUTZ_POSITION_NO: "POS-0006", OUTZ_PLNO: "WJ02410010", OUTZ_OYA_HINBAN: "WJ02410010",
								OUTZ_HOJO_HINBAN: "001", OUTZ_SHORI_NO: "G057437",
								OUTRSNUM: "0000024953", OUTRSPOS: "0491", OUTPOSNR: "0489",OUTGYOKUBUN: "A",   // 追加行
							},
						];					
						this._initialSortProperties(aMock);
						this._setTableData(aMock);
					})
					.catch(() => BusyIndicator.hide());
			},

			/**
			 * Handle transfer URL parameter to filter value
			 * @returns
			 */
			_handleSetValueParamToFilter: function () {
				const aValues = [];
				const aFilterBars = this._getFilterBars();
				const aFilterItems = aFilterBars.reduce((aAccumulator, oFilterBar) => {
					const aItems = oFilterBar.getAllFilterItems();
					return [...aAccumulator, ...aItems];
				}, []);
				const oFilter = this._getScreenModel();
				const sHash = window.location.hash;
				const sQuery = sHash.split("?")[1] || sHash;

				aFilterItems.forEach((oItem) => {
					const sName = oItem.getProperty("name");
					const sValue = UriParameters.fromQuery(sQuery).get(sName) || "";
					let jsonParseValue;
					if (!sValue) {
						return;
					}
					const decodeURI = decodeURIComponent(sValue);
					try {
						jsonParseValue = JSON.parse(decodeURI);
					} catch {
						jsonParseValue = decodeURI;
					}

					if (typeof jsonParseValue === "number") {
						jsonParseValue = jsonParseValue.toString();
					}

					aValues.push({
						sName,
						sValue: jsonParseValue,
					});
				});
				aValues.forEach((oValue) => {
					oFilter.setProperty(`/${oValue.sName}`, oValue.sValue);
				});
				if (aValues.length > 0) {
					this.onPressSearchButton();
				}
			},

			/**
			 * handle connect to the Personalization service when start app
			 */
			_connectPersonalizationService: async function () {
				const oView = this.getView();
				const sIdVariant = UriParameters.fromQuery(window.location.search).get("variant-id");
				await variant.connectPersonalizationService(oView, Constants.PROGRAM_ID, sIdVariant);
			},

			// *** GETTER *** //
			/**
			 * Get OData model
			 */
			_getOdataModel: function () {
				return this.getOwnerComponent().getModel();
			},

			/**
			 * Get Odata subModel
			 */
			_getSubOdataModel: function () {
				return this.getOwnerComponent().getModel("subModel");
			},

			/**
			 * Get Table model
			 */
			_getTableModel: function () {
				return this.getView().getModel("oDataTable");
			},

			/**
			 * Get Screen model
			 */
			_getScreenModel: function () {
				return this.getView().getModel("screen");
			},

			/**
			 * Get search help model
			 */
			_getSearchHelpModel: function () {
				return this.getView().getModel("searchHelpModel");
			},

			_getListByModelName: function (sModelName) {
				return this.getView().getModel(sModelName)?.getData() || [];
			},

			/**
			 * Get Table UI control
			 */
			_getTableControl: function () {
				return this.getView().byId("table");
			},

			/**
			 * Get control by id
			 * @param {string} sControlId
			 */
			_getControlById: function (sControlId) {
				return this.getView().byId(sControlId);
			},

			/* Get contexData */
			_getTableContextData: function (oTable) {
				const aData = [];
				const oBinding = oTable.getBinding("rows");
				if (!oBinding) {
					return aData;
				}
				const aDataLength = oBinding.oList.length;
				const aTableContext = oTable.getBinding("rows").getContexts(0, aDataLength);
				aTableContext.forEach((oTableContextItem) => {
					aData.push(oTableContextItem.getObject());
				});
				return aData;
			},

			/**
			 * Get oRow data from oEvent
			 */
			_getORowData: function (oEvent) {
				const oRowData = oEvent.getSource().getBindingContext("oDataTable").getObject();
				if (oRowData) {
					return oRowData;
				} else {
					return {};
				}
			},

			/**
			 * handle get selected indices
			 * @returns {Map} array selected indices
			 */
			_getSelectedIndices: function () {
				const oTable = this._getTableControl();
				const oRowBinding = oTable.getBinding("rows");
				const oList = oRowBinding.oList;
				const aIndices = oRowBinding.aIndices;
				const aSelectedIndices = [];
				aIndices.forEach((iItem, index) => {
					if (oList[iItem].selected) {
						aSelectedIndices.push(index);
					}
				});
				return aSelectedIndices;
			},

			/**
			 * get position row add selection in the table
			 */
			_getPositionRowAddSelection: function (oEvent) {
				const oRow = this._getORowData(oEvent);
				const oTable = this._getTableControl();
				const oRowBinding = oTable.getBinding("rows");

				const oList = oRowBinding.oList;
				const aIndices = oRowBinding.aIndices;

				const iItemIndex = oList.findIndex((oData) => oData.index === oRow.index);
				const iItemPosition = aIndices.findIndex((index) => index === iItemIndex);
				return iItemPosition;
			},

			/**
			 * Get all filter bars inside the DynamicPageHeader
			 * @returns {sap.ui.comp.filterbar.FilterBar[]}
			 */
			_getFilterBars: function () {
				return this.byId("_MainDynamicPageHeader")
					.getContent()
					.filter((oContent) => oContent instanceof sap.ui.comp.filterbar.FilterBar);
			},

			/**
			 * handle get object component
			 */
			_getMyComponent: function () {
				const sComponentId = sap.ui.core.Component.getOwnerIdFor(this.getView());
				return sap.ui.component(sComponentId);
			},

			// *** SETTER *** //
            /**
			 * Set odata convert to json model to view
			 * @param {Object} oDataModel
			 * @param {String} sModelName
			 */
			_setModelByName: function (oDataModel, sModelName) {
				this.getView().setModel(new JSONModel(oDataModel.results), sModelName);
			},

			/**
			 * Set the table data and the record count.
			 * Replaces the old _setTableData() — takes a plain array, not { results }.
			 * @param {Object[]} aResults
			 */
			_setTableData: function (aResults) {
				const aData = aResults || [];
				this._setTotalRecord(aData.length);
				this.getView().setModel(new JSONModel(aData), "oDataTable");
			},

			/**
			 * Set the record count shown on the table header
			 * @param {number} iCount
			 */
			_setTotalRecord: function (iCount) {
				this._getScreenModel().setProperty("/RowCount", iCount);
			},

			/**
			 * Recount the total record from the current table model.
			 * Use it after the table data is mutated in place (追加 / 複写 / 削除).
			 */
			_refreshTotalRecord: function () {
				const oTableModel = this._getTableModel();
				this._setTotalRecord(oTableModel ? oTableModel.getData().length : 0);
			},

			/**
			 * Set data to property
			 */
			_setSearchHelpProperty: function (oData, sProperty) {
				const searchHelpModel = this.getView().getModel("searchHelpModel");
				if (sProperty === "SearchHelpStgLocationSet") {
					oData.results.unshift({ Lgort: "", Name1: "" });
				}
				searchHelpModel.setProperty(`/${sProperty}`, oData.results);
			},

			/**
			 * _setDropdownDeliveryinstructionstatus
			 */
			_setDropdownDeliveryinstructionstatus: function (oData) {
				const oListDataDropdown = oData.results;
				oListDataDropdown.unshift({ key: "", value: "" });
				this.getView().setModel(new JSONModel(oListDataDropdown), "DropdownDeliveryinstructionstatus");
			},

			/**
			 * _setDropdownStoragelocation
			 */
			_setDropdownStoragelocation: function (oData) {
				const oListDataDropdown = oData.results;
				oListDataDropdown.unshift({ key: "", value: "" });
				this.getView().setModel(new JSONModel(oListDataDropdown), "DropdownStoragelocation");
			},

			/**
			 * setModelBuildingCodeData
			 */
			_setModelReportListData: function (oData) {
				this.getView().setModel(new JSONModel(oData.results), "oDataTable");
			},

			/**
			 * _setModelProcurement
			 */
			_setModelProcurement: function (oData) {
				this.getView().setModel(new JSONModel(oData.results), "Procurement");
			},

			/**
			 * _setModelGoodsissuetask
			 */
			_setModelGoodsissuetask: function (oData) {
				this.getView().setModel(new JSONModel(oData.results), "Goodsissuetask");
			},

			/**
			 * _setModelunit
			 */
			_setModelunit: function (oData) {
				this.getView().setModel(new JSONModel(oData.results), "unit");
			},

			/**
			 * _setModelMaterial
			 */
			_setModelMaterial: function (oData) {
				this.getView().setModel(new JSONModel(oData.results), "Material");
			},

			/**
			 * Function set index table
			 */
			_handleSetIndexOData: function (oData) {
				oData.results.forEach((data, index) => {
					data.index = index + 1;
				});
				return oData;
			},

			// *** READ ODATA *** //
			/**
			 * OData model read data
			 */
			_readOData: function (aFilters = [], PATH = "ComponentItemSchListSet") {
				// Reset register button after the main table reloads 
				if (PATH === "ComponentItemSchListSet") {
					this.byId("RegBtn001").setEnabled(true);
				}

				return new Promise(
					function (fResolve, fReject) {
						this._getOdataModel().read(`/${PATH}`, {
							filters: aFilters,
							success: function (oData) {
								fResolve(oData);
							},
							error: function (oResponse) {
								const message = this._getMessageResponse(oResponse);
								const aMessages = [
									{
										type: "Error",
										title: this.oBundle.getText("ErrorTitle"),
										description: message,
										subtitle: message,
										counter: 1,
									},
								];
								if (PATH === "ComponentItemSchListSet") {
									this._getTableModel().setData([]);
									this._setTotalRecord(0);
								}
								fReject({ aMessages });
							}.bind(this),
						});
					}.bind(this)
				);
			},

			/* 
          Refresh Odata
         */
			_reFreshOdata: function () {
				this._getScreenModel().setProperty("/bCheckAll", false);
				BusyIndicator.show(0);

				this._getFilters()
					//retrieve data
					.then(this._readOData.bind(this))
					.then(this._setResult.bind(this))
					.then(this._clearMessages.bind(this))
					.then(this._initDeleteList.bind(this))
					.catch((aMessages) => this._resetMessages({ aMessages }, false))
					.finally(() => {
						// hide loading
						BusyIndicator.hide();
					});
				Promise.resolve();
			},

			// *** HANDLE SEARCH BUTTON *** //
			/**
			 * Event handling when Search button pressed
			 */
			onPressSearchButton: function () {
				this._getScreenModel().setProperty("/bCheckAll", false);
				//get filters from screen
				BusyIndicator.show(0);
					this._getFilters()
					// Clear all messages before search to avoid confusion with past messages 
					.then(this._removeAllMessages.bind(this))
					//retrieve data
					.then(this._readOData.bind(this))
					//set retrieved data to screen
					.then(this._setResult.bind(this))
					//clear all messages
					.then(this._clearMessages.bind(this))
					//set property sort or index to the table
					.then(this._handleBindVariantAfterSearch.bind(this))
					// clear delete list
					.then(this._initDeleteList.bind(this))
					//when error occurs above, output messages
					.catch(this._resetMessages.bind(this))
					.finally(() => {
						// hide loading
						BusyIndicator.hide();
					});
			},

			/**
			 * Clear all messages and pass through data for chaining 
			 */
			_removeAllMessages: function (aFilters) {
				sap.ui.getCore().getMessageManager().removeAllMessages();
				return aFilters;
			},

			/**
			 * Get filters from screen
			 */
			_getFilters: function () {
				const aMessages = [];
				const oFilter = this._getScreenModel().getData();
				const aFilters = [];
				const oRequiredDateControl = this._getControlById("BDTER"); // [所要日付]

				// check require field プラント
				if (!oFilter.Plant) {
					oFilter["valueStatePlant"] = ValueState.Error;
					oFilter["valueStateTextPlant"] = this.oBundle.getText("Error001");
					const oMessages = {
						type: "Error",
						title: this.oBundle.getText("ErrorTitleRequire"),
						description: this.oBundle.getText("Error001"),
						subtitle: this.oBundle.getText("Error001"),
						counter: 1,
					};

					aMessages.push(oMessages);
				} else {
					oFilter["valueStatePlant"] = ValueState.None;
					oFilter["valueStateTextPlant"] = "";
				}

				if (!this._validateInputs(Constants.IdDateFieldsFilter)) {
					const oMessages = {
						type: "Error",
						title: this.oBundle.getText("ErrorTitle"),
						description: this.oBundle.getText("ErrorDate"),
						subtitle: this.oBundle.getText("ErrorDate"),
						counter: 1,
					};

					aMessages.push(oMessages);
				}
				// check require field 機台NO、品目、所要日付
				else if (
					!oFilter.MachineNo &&
					!oFilter.ItemCode &&
					!oFilter.RequiredDate
				) {
					oFilter["valueStateMachineNo"] = ValueState.Error;
					oFilter["valueStateTextMachineNo"] = this.oBundle.getText("Error003");
					oFilter["valueStateItemCode"] = ValueState.Error;
					oFilter["valueStateTextItemCode"] = this.oBundle.getText("Error003");
					oFilter["valueStateRequiredDate"] = ValueState.Error;
					oFilter["valueStateTextRequiredDate"] = this.oBundle.getText("Error003");
					const oMessages = {
						type: "Error",
						title: this.oBundle.getText("ErrorTitleRequire"),
						description: this.oBundle.getText("Error003"),
						subtitle: this.oBundle.getText("Error003"),
						counter: 1,
					};

					aMessages.push(oMessages);
				} else {
					oFilter["valueStateMachineNo"] = ValueState.None;
					oFilter["valueStateTextMachineNo"] = "";
					oFilter["valueStateItemCode"] = ValueState.None;
					oFilter["valueStateTextItemCode"] = "";
					oFilter["valueStateRequiredDate"] = ValueState.None;
					oFilter["valueStateTextRequiredDate"] = "";
				}

				//機台NO（前方一致）
				if (oFilter.MachineNo) {
					aFilters.push(new Filter("INZ_KIDAI_NO", FilterOperator.Contains, oFilter.MachineNo));
				}

				//組立かたまり
				if (oFilter.AssemblyGroup) {
					aFilters.push(new Filter("INSORTL", FilterOperator.EQ, oFilter.AssemblyGroup));
				}

				//出庫タスク
				if (oFilter.OutboundTask) {
					aFilters.push(new Filter("INZ_TASK_CODE", FilterOperator.EQ, oFilter.OutboundTask));
				}

				//要求NO
				if (oFilter.RequestNo) {
					aFilters.push(new Filter("INUSR02", FilterOperator.EQ, oFilter.RequestNo));
				}

				//品目
				if (oFilter.ItemCode) {
					aFilters.push(new Filter("INMATNR", FilterOperator.EQ, oFilter.ItemCode));
				}
				
				//プラント
				if (oFilter.Plant) {
					aFilters.push(new Filter("INWERKS", FilterOperator.EQ, oFilter.Plant));
				}

				//図番
				if (oFilter.DrawingNo) {
					aFilters.push(new Filter("INZ_ZUBAN", FilterOperator.EQ, oFilter.DrawingNo));
				}

				//出庫先
				if (oFilter.Destination) {
					aFilters.push(new Filter("INZ_SHUKKOSAKI", FilterOperator.EQ, oFilter.Destination));
				}

				// Required Date - [所要日付]
				if (oFilter.RequiredDate) {
					const aSplitDate = oFilter.RequiredDate.split(" - ");
					const sFirstDate = Formatter.dateInputFormatter(aSplitDate[0]);
					const sSecondDate = Formatter.dateInputFormatter(aSplitDate[1]) || null;

					if (!sSecondDate) {
						aFilters.push(new Filter("INBDTER", FilterOperator.GE, sFirstDate));
					} else {
						aFilters.push(new Filter("INBDTER", FilterOperator.BT, sFirstDate, sSecondDate));
					}
				}

				// Date format validation: Required Date - [所要日付]
				const aRequiredDateResults = Validator._controlValidations(oRequiredDateControl, "", "", [
					{
						fnCheck: () => Validator.isDateString(oFilter.RequiredDate),
						sMessage: this.oBundle.getText("ErrorDate"),
					},
				]);
				
				if (aRequiredDateResults.length) {
					aMessages.push(Message.createErrorMessage(aRequiredDateResults[0]));
				}	

				//出庫指示状況
				if (oFilter.IssueInstructionStatus) {
					const IssueInstructionStatus = oFilter.IssueInstructionStatus === "X" ? "X" : "";
					aFilters.push(new Filter("INZ_SHUKKO_JOUKYOU", FilterOperator.EQ, IssueInstructionStatus));
				}

				//実出庫NO
				if (oFilter.ActualGoodsIssueNo) {
					aFilters.push(new Filter("INZ_JITSUSHUKKO_NO", FilterOperator.EQ, oFilter.ActualGoodsIssueNo));
				}

				//保管場所
				if (oFilter.StorageLocation || this.getView().byId("LGORT").getValue()) {
					aFilters.push(
						new Filter(
							"INLGORT",
							FilterOperator.EQ,
							oFilter?.StorageLocation || this.getView().byId("LGORT").getValue().trim()
						)
					);
				}

				//PL
				if (oFilter.PL) {
					aFilters.push(new Filter("INZ_PLNO", FilterOperator.EQ, oFilter.PL));
				}

				//親品番
				if (oFilter.ParentPartNo) {
					aFilters.push(new Filter("INZ_OYA_HINBAN", FilterOperator.EQ, oFilter.ParentPartNo));
				}

				//処理NO
				if (oFilter.ProcessNo) {
					aFilters.push(new Filter("INZ_SHORI_NO", FilterOperator.EQ, oFilter.ProcessNo));
				}

				// 出庫完了フラグ
				if (oFilter.IssueCompletionFlag) {
					const IssueCompletionFlag = oFilter.IssueCompletionFlag === "X" ? "X" : "";
					aFilters.push(new Filter("INKZEAR", FilterOperator.EQ, IssueCompletionFlag));
				}

				// Filter by [購買依頼タイプ] 
				if (oFilter.PurchaseRequisitionType || this.getView().byId("KOUBAI_IRAI_TYPE").getValue()) {
					aFilters.push(
						new Filter(
							"INKOUBAI_IRAI_TYPE",
							FilterOperator.EQ,
							oFilter?.PurchaseRequisitionType?.trim() || this.getView().byId("KOUBAI_IRAI_TYPE").getValue()
						)
					);
				}

				// Filter by [組計状況]
				if (Array.isArray(oFilter.AssemblyPlanningStatus) && oFilter.AssemblyPlanningStatus.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.AssemblyPlanningStatus, "INSTAT"));
				}

				if (aMessages.length === 0) {
					return Promise.resolve(aFilters);
				} else {
					return Promise.reject({ aMessages });
				}
			},

			/**
			 *  Get filter values from model
			 */
			_getFiltersFromTokenModel: function (aTokenModel, sKey) {
				const aFilters = aTokenModel.map((oTokenModel) => {
					return new Filter(sKey, FilterOperator.EQ, oTokenModel.key?.toString() || oTokenModel);
				});
				return new Filter({
					filters: aFilters,
					and: false,
				});
			},

			/**
			 * Reset value state input filterbar
			 */
			onChangeValidateFilter: function (oEvent, sField) {
				const oInput = oEvent.getSource();
				const sValue = oInput.getValue();
				const oFilter = this._getScreenModel().getData();
				if (sField === "Plant") {
					if (sValue) {
						oFilter["valueStatePlant"] = ValueState.None;
						oFilter["valueStateTextPlant"] = "";
					}
				} else if (sField === "RequiredDate") {
					this._checkValidDateField(oEvent); 
				} else {
					if (sValue) {
						oFilter["valueStateMachineNo"] = ValueState.None;
						oFilter["valueStateTextMachineNo"] = "";
						oFilter["valueStateItemCode"] = ValueState.None;
						oFilter["valueStateTextItemCode"] = "";
						oFilter["valueStateRequiredDate"] = ValueState.None;
						oFilter["valueStateTextRequiredDate"] = "";
					}
				}
				this._getScreenModel().refresh();
			},

			/**
			 * Set retrieved data to screen
			 */
			_setResult: function (oData, flagIndex = true) {
				if (!oData.results.length) {
					const oMessages = {
						type: "Error",
						title: this.oBundle.getText("ErrorTitle"),
						description: this.oBundle.getText("Error002"),
						subtitle: this.oBundle.getText("Error002"),
						counter: 1,
					};
					return Promise.reject({ aMessages: [oMessages] });
				}

				const aStgLocationSetItems = this.getView()
					.getModel("StorageLocationModel")
					.getData() || [];
				oData.results.forEach((item) => {
					const iIssuedQuantity = parseFloat((item?.OUTENMNG || "").trim().replaceAll(",", ""));
					const iRequiredQuantity = parseFloat((item?.OUTBDMNG || "").trim().replaceAll(",", ""));
					const iAllocatedQuantity = parseFloat((item?.OUTHIKIATESUYO || "").trim().replaceAll(",", "")); // [引当数量] 
					item.OUTENMNG = item?.OUTENMNG?.trim() ? Number(iIssuedQuantity).toFixed(3) : ""; // [引落数量] 
					item.OUTBDMNG = item?.OUTBDMNG?.trim() ? Number(iRequiredQuantity).toFixed(3) : ""; // [所要数量] 
					item.OUTHIKIATESUYO = item?.OUTHIKIATESUYO?.trim()
						? Number(iAllocatedQuantity).toFixed(3)
						: ""; // [引当数量] 
					item.OUTERFMG = `${Math.round(item?.OUTERFMG) || ""}`; // [数量] 

					const bIsIssueComplete = item?.OUTKZEAR === "X";
					item.OUTKZEAR = bIsIssueComplete ? "済" : "未";
					item.OUTHIKIATESUYO = bIsIssueComplete ? "" : item.OUTHIKIATESUYO; // Set [引当数量] blank when [出庫完了フラグ] = '済' 

					// ADD: Check if the value of Lgort key exists in the Combobox item
					const bLocationExists = aStgLocationSetItems.some((oItem) => oItem.Lgort === item.OUTLGORT);

					// ADD: set OUTLGORTvalue
					//      If the value of the Lgort key does not exist in the Combobox item, set it to blank.
					item.OUTLGORTvalue = bLocationExists ? item.OUTLGORT : "";

					item.OUTKOUBAI_IRAI_TYPEvalue = item.OUTKOUBAI_IRAI_TYPE; // 購買依頼タイプ 
					item.Outrgekz001 = item?.Outrgekz001 === "X"; // [BF] 
					// 'N' 通常行 / 'R' 表示行 / 'D' 削除行 / 'A' 追加行
					// Spec note: 'R' is the same control as PS047's [変更不可活動フラグ]
					// TODO: drop this fallback once the backend returns [行区分]
					item.OUTGYOKUBUN = item.Outunchangeflg001 ? "R" : "N";
				});

				this._initialSortProperties(oData.results);
				if (flagIndex) {
					this._setTableData(this._handleSetIndexOData(oData).results);
				} else {
					this._setTableData(oData.results);
				}
				return Promise.resolve();
			},

			/**
			 * Initial sort property for number items
			 * @param {object} oData
			 */
			_initialSortProperties: function (aInputData) {
				const oFormatter = new Intl.NumberFormat("en-US", {
					currency: "JPY",
					minimumFractionDigits: 0,
				});
				const aSortField = [...Constants.NumberColumns, ...Constants.AmountColumns];
				if (aInputData.length) {
					aInputData.forEach((oItem) => {
						aSortField.forEach((sField) => {
							const sInputValue = oItem[sField]?.replaceAll(",", "");
							let sFormatData = oFormatter.format(sInputValue);
							const iIndexOf = sFormatData.indexOf(".");
							if (iIndexOf !== -1) {
								if (sFormatData >= Number.MAX_SAFE_INTEGER) {
									sFormatData = sFormatData.substring(0, iIndexOf);
								}
							}
							try {
								if (sFormatData >= Number.MAX_SAFE_INTEGER) {
									oItem[`${sField}Sort`] =
										sFormatData && BigInt(sFormatData.trim().replaceAll(",", ""));
								} else {
									oItem[`${sField}Sort`] =
										sFormatData && parseFloat(sFormatData.trim().replaceAll(",", ""));
								}
							} catch {
								oItem[`${sField}Sort`] = 0;
							}
						});
					});
				}
			},

			/**
			 * Sort Search Help [組計状況] by custom order
			 */
			_sortAssemblyStatusSearchHelp: function (aData) {
				const getStatusIndex = (sStatusCode) => {
					switch (sStatusCode) {
						case "10":
							return 1;
						case "15":
							return 2;
						case "80":
							return 3;
						case "20":
							return 4;
						case "30":
							return 5;
						case "40":
							return 6;
						case "90":
							return 7;
						default:
							return -1;
					}
				};

				return [...aData].sort((a, b) => getStatusIndex(a.Code) - getStatusIndex(b.Code));
			},

			// *** HANDLE MESSAGE *** //
			/**
			 * Output screen messages
			 */
			_resetMessages: function ({ aMessages, oMessages }, bRefresh = false, bSkipMandatoryPopup = false) {
				if (bRefresh) {
					return Promise.resolve();
				}

				if (oMessages) {
					MessageBox.show(oMessages.description, {
						icon: MessageBox.Icon.ERROR,
						...oMessages,
					});
				}
				const oScreenModel = this._getScreenModel();
				aMessages = aMessages || [];

				oScreenModel.setProperty("/Messages", aMessages);
				const iCount = aMessages.length;
				oScreenModel.setProperty("/MessageCount", iCount);
				oScreenModel.setProperty("/HaveMessage", iCount !== 0);

				let sButtonType = "Default";
				let sButtonIcon = "sap-icon://message-success";
				if (
					aMessages.find(function (oMessage) {
						return oMessage.type === "Error";
					})
				) {
					sButtonType = "Negative";
					sButtonIcon = "sap-icon://message-error";
					// Register must show this confirmation popup on error and Excel import must NOT show it
					if (!bSkipMandatoryPopup) {
						MessageBox.error(this.oBundle.getText("mandatoryErrorContent"));
					}
				} else if (
					aMessages.find(function (oMessage) {
						return oMessage.type === "Success";
					})
				) {
					sButtonType = "Success";
					sButtonIcon = "sap-icon://message-success";
				}

				oScreenModel.setProperty("/MessageButtonType", sButtonType);
				oScreenModel.setProperty("/MessageButtonIcon", sButtonIcon);
				return Promise.resolve();
			},

			/**
			 * Event handling onPressMessage
			 */
			onPressMessageButton: function (oEvent) {
				const oMessagePopover = this.getView().byId("messageArea");
				oMessagePopover.toggle(oEvent.getSource());
			},

			/**
			 * Clear screen messages
			 */
			_clearMessages: function () {
				return this._resetMessages([]);
			},

			/**
			 * Get messages response from BE
			 */
			_getMessageResponse: function (oResponse) {
				if (oResponse.statusCode === 500) {
					return this.oBundle.getText("ErrorUnknown");
				} else {
					const oRes = JSON.parse(oResponse?.responseText || "") || "";
					return oRes?.error?.message?.value || "";
				}
			},

			// *** HANDLE CLEAR BUTTON *** //
			/** Event handle onPressClear */
			onPressClearButton: function () {
				const oScreenModel = this._getScreenModel();
				oScreenModel.setProperty("/MachineNo", "");
				oScreenModel.setProperty("/AssemblyGroup", "");
				oScreenModel.setProperty("/OutboundTask", "");
				oScreenModel.setProperty("/RequestNo", "");
				oScreenModel.setProperty("/ItemCode", "");
				oScreenModel.setProperty("/Plant", "");
				oScreenModel.setProperty("/DrawingNo", "");
				oScreenModel.setProperty("/Destination", "");
				oScreenModel.setProperty("/RequiredDate", null);
				oScreenModel.setProperty("/RequiredDateTo", null);
				oScreenModel.setProperty("/IssueInstructionStatus", "");
				oScreenModel.setProperty("/ActualGoodsIssueNo", "");
				oScreenModel.setProperty("/StorageLocation", "");
				oScreenModel.setProperty("/PL", "");
				oScreenModel.setProperty("/ParentPartNo", "");
				oScreenModel.setProperty("/ProcessNo", "");
				oScreenModel.setProperty("/RequirementValue", null);
				oScreenModel.setProperty("/IssueCompletionFlag", "");
				oScreenModel.setProperty("/PurchaseRequisitionType", "");
				oScreenModel.setProperty("/AssemblyPlanningStatus", []); // Add clear Assembly Status

				this.getView().byId("LGORT").setValue("");
				this.getView().byId("KOUBAI_IRAI_TYPE").setValue("");

				this._clearMessages();
				this._clearValueState(Constants.IdDateFieldsFilter);
			},

			_clearValueState: function (aIdFields) {
				aIdFields.forEach((sId) => {
					let oControl = this.byId(sId);
					oControl.setValue("");
					oControl.setValueState("None");
				});
			},

			// *** HANDLE VALUE HELP *** //
			/**
			 * handle request value help
			 */
			onValueHelpRequest: function (oEvent) {
				console.log(oEvent);
				const oInput = oEvent.getSource();
				const sInputId = oInput.getId();
				let oRow;
				let indexRow;
				let iItemPosition;
				// bRequestInTable check request valuehelp in table
				const bRequestInTable = !sInputId.includes("MATNR001") && !sInputId.includes("WERKS001");
				if (bRequestInTable) {
					oRow = this._getORowData(oEvent);
					indexRow = oRow.index;
					iItemPosition = this._getPositionRowAddSelection(oEvent);
				}
				let sItemSearch = "";

				this.valueHelpInputId = sInputId;
				// Handle check 機台NO/machine No] [プラント/plant] when open 出庫タスク
				if (sInputId.includes("OUTZ_TASK_CODE")) {
					const { bResult: bValid } = this._handleCheckValidateCell(
						oRow,
						["OUTZ_KIDAI_NO", "OUTWERKS"],
						true
					);
					if (!bValid) {
						const aMessages = [
							{
								type: "Error",
								title: this.oBundle.getText("ErrorTitleRequire"),
								description: this.oBundle.getText("Error005"),
								subtitle: this.oBundle.getText("Error005"),
								counter: 1,
							},
						];
						return this._resetMessages({ aMessages });
					}
				}
				if (!this._valueHelpDialog) {
					this._valueHelpDialog = Fragment.load({
						id: "valueHelpDialog",
						name: "zpsr0019.view.ValueHelpDialog",
						controller: this,
					}).then(
						async function (oDialog) {
							this.getView().addDependent(oDialog);
							//remove search help
							if (sInputId.includes("OUTWERKS")) {
								// プラント
								sItemSearch = "Code";
								this._readOData([], "SearchHelpPlantSet")
									.then(
										function (oData) {
											this._setModelByName(oData, "PlantModel");
											this._setDataToValueHelp(
												oDialog,
												"heaederPlant",
												"PlantModel",
												"Code",
												"noDataTextPlant",
												"Text"
											);
										}.bind(this)
									)
									.finally(() => oDialog.setBusy(false));
							} else if (sInputId.includes("OUTKOUBAI_IRAI_TYPE")) {
								// 調達タイプ
								sItemSearch = "Code";
								this._readOData([], "SearchHelpPurTypeSet")
									.then(
										function (oData) {
											this._setModelByName(oData, "PurchaseReqTypeModel");
											this._setDataToValueHelp(
												oDialog,
												"headerProcurement",
												"PurchaseReqTypeModel",
												"Code",
												"noDataTextProcurement",
												"Text"
											);
										}.bind(this)
									)
									.finally(() => oDialog.setBusy(false));
							} else if (sInputId.includes("OUTERFME")) {
								sItemSearch = "Code";
								this._readOData([], "SearchHelpUnitSet")
									.then(
										function (oData) {
											this._setModelByName(oData, "UnitModel");
											this._setDataToValueHelp(
												oDialog,
												"headerInputUnit",
												"UnitModel",
												"Code",
												"noDataTextunit",
												"Text"
											);
										}.bind(this)
									)
									.finally(() => oDialog.setBusy(false));
							} else if (sInputId.includes("OUTZ_TASK_CODE")) {
								sItemSearch = "Ztaskcode";
								await this._handleSetModelTaskCodeSet(oRow).finally(() => oDialog.setBusy(false));
								this._setDataToValueHelp(
									oDialog,
									"headerGoodsIssueTask",
									"TaskCodeModel",
									"Ztaskcode",
									"noDataTextGoodsissuetask",
									"Zkidaino",
									""
								);
							}
							return oDialog;
						}.bind(this)
					);
				}

				this._valueHelpDialog.then(
					function (oDialog) {
						oDialog.open();
					}.bind(this)
				);

				this._valueHelpDialog.then(
					function (oDialog) {
						oDialog.attachCancel(function () {
							oDialog.destroy();
							this._valueHelpDialog = null;
						}, this);

						oDialog.attachConfirm(function (oEvent) {
							const oSelectedItem = oEvent.getParameter("selectedItem");
							if (oSelectedItem) {
								const sSelectedValue = oSelectedItem.getTitle();
								// const sDescription = oSelectedItem.getDescription();
								oInput.setValue(sSelectedValue);
								if (oRow) {
									const oTable = this._getTableControl();
									// auto check for checkbox in table
									oRow.selected = true;
									if (oRow.operation !== "I") {
										oRow.operation = "U";
									}
									// oTable.addSelectionInterval(iItemPosition, iItemPosition);

									if (sInputId.includes("OUTZ_TASK_CODE")) {
										oRow.valueStateOutboundTask = ValueState.None;
										const sOUTZ_KIDAI_NO = oRow.OUTZ_KIDAI_NO.replaceAll(" ", "%20");
										const sOUTWERKS = oRow.OUTWERKS.replaceAll(" ", "%20");
										const sOUTZ_TASK_CODE = sSelectedValue.replaceAll(" ", "%20");
										const sPath = `SuggestForBdterSet(Z_KIDAI_NO='${sOUTZ_KIDAI_NO}',INWERKS='${sOUTWERKS}',Z_TASK_CODE='${sOUTZ_TASK_CODE}')`;
										this._readOData([], sPath).then(
											function (oData) {
												oRow.OUTBDTER = oData.OUTBDTER;
												oRow.valueStateOUTBDTER = ValueState.None;
												this._getTableModel().refresh();
											}.bind(this)
										);
									} else if (sInputId.includes("OUTWERKS")) {
										oRow.valueStatePlant = ValueState.None;
									} else if (sInputId.includes("OUTKOUBAI_IRAI_TYPE")) {
										oRow.valueStatePurchaseRequisitionType = ValueState.None;
									} else if (sInputId.includes("OUTERFME")) {
										oRow.valueStateOUTERFME = ValueState.None;
									}
								}
								if (sInputId.includes("WERKS001")) {
									this._handleReloadStgLocationSet(sSelectedValue);
								}
							}
							this._valueHelpDialog = null;
							oDialog.destroy();
						}, this);

						oDialog.attachSearch(function (oEvent) {
							let sValue = oEvent.getParameter("value");
							let oFilter = new Filter(sItemSearch, FilterOperator.Contains, sValue);
							let oBinding = oEvent.getParameter("itemsBinding");
							oBinding.filter([oFilter]);
						}, this);
					}.bind(this)
				);
			},

			/**
			 * set Data from OData to value help fragment
			 * @param oSelectDialog
			 * @param title header Dialog
			 * @param sProperty
			 * @param sTitle
			 * @param sNoData
			 * @param sDescription
			 */
			_setDataToValueHelp: function (oSelectDialog, title, sModelName, sTitle, sNoData, sDescription) {
				if (sNoData) {
					oSelectDialog.setNoDataText(this.oBundle.getText(sNoData));
				}

				oSelectDialog.setTitle(this.oBundle.getText(title));
				const standardListItem = new sap.m.StandardListItem({
					title: `{${sModelName}>${sTitle}}`,
					type: "Active",
					description: `{=!\${${sModelName}>${sDescription}} ? ' ' : \${${sModelName}>${sDescription}}}`,				});

				oSelectDialog.bindAggregation("items", {
					path: `${sModelName}>/`,
					template: standardListItem,
				});

				const aItems = oSelectDialog.getItems();
				this._handleSetSelectedDialog(aItems);
			},

			/**
			 * Hanle set selected value in the search help
			 */
			_handleSetSelectedDialog: function (aItems) {
				const selectedName = this.byId(this.valueHelpInputId).getValue();
				aItems.forEach((item) => {
					if (item.getTitle() === selectedName) {
						item.setSelected(true);
					}
				});
			},

			/**
			 * Show all item when use suggestion
			 */
			onSuggest: function (oEvent, sField1, sField2) {
				const sSuggestValue = oEvent.getParameter("suggestValue");
				const oInput = oEvent.getSource();
				const aFilters = [];
				if (sSuggestValue) {
					aFilters.push(new Filter(sField1, FilterOperator.Contains, sSuggestValue));
					sField2 && aFilters.push(new Filter(sField2, FilterOperator.Contains, sSuggestValue));
				}
				oInput.setFilterFunction(function (sSuggestValue, oItem) {
					return oItem.getText().match(new RegExp(sSuggestValue, "i"));
				});
				oInput.getBinding("suggestionItems").filter(aFilters);
				oInput.getBinding("suggestionItems").refresh();
			},

			/**
			 * Handle show suggestion in OUTZ_TASK_CODE [出庫タスク/OutboundTask] input
			 */
			onFormatShowSuggestionOutboundTask: function (oEvent) {
				const oInput = this.getView().byId("OUTZ_TASK_CODE");
				const oRow = this._getORowData(oEvent);
				if (oRow.OUTZ_KIDAI_NO && oRow.OUTWERKS) {
					// call API get data for SearchHelpTaskCodeSet
					oInput.setShowSuggestion(true);
					this._handleSetModelTaskCodeSet(oRow);
				} else {
					oInput.setShowSuggestion(false);
				}
			},

			/**
			 * Handle call API, set data to fragment value help
			 * @param {Object} oRow
			 */
			_handleSetModelTaskCodeSet: function (oRow) {
				const sOUTZ_KIDAI_NO = oRow.OUTZ_KIDAI_NO;
				const sOUTWERKS = oRow.OUTWERKS;
				const aFilter = [];
				aFilter.push(new Filter("Zkidaino", FilterOperator.EQ, sOUTZ_KIDAI_NO));
				aFilter.push(new Filter("Werks", FilterOperator.EQ, sOUTWERKS));
				return this._readOData(aFilter, "SearchHelpTaskCodeSet")
					.then((oData) => this._setModelByName(oData, "TaskCodeModel"))
					.catch(() => this._setModelByName({results: [] }, "TaskCodeModel"));
			},

			/**
			 * Reload SearchHelpStgLocationSet when change Plant
			 */
			onLoadStgLocationSet: function (oEvent) {
				const sPlant = oEvent.getSource().getSelectedKey();
				const oScreenModel = this._getScreenModel();
				oScreenModel.setProperty("/Plant", sPlant);

				// When プラント is changed, clear the selected 保管場所.
				oScreenModel.setProperty("/StorageLocation", "");

				this._handleReloadStgLocationSet(sPlant);
			},

			_handleReloadStgLocationSet: function (sPlant) {
				const aFilter = [];
				if (sPlant) {
					aFilter.push(new Filter("Werks", FilterOperator.EQ, sPlant));
				}
				this._readOData(aFilter, "SearchHelpStgLocationSet").then((oData) =>{
					oData.results.unshift({ Werks: "", Lgort: "", Name1: "" });
					this._setModelByName(oData, "StorageLocationModel")					
				});
			},

			// *** HANDLE ROW ACTION *** //
			/**
			 * handle add table
			 */
			onPressAddButton: function () {
				const oTableControl = this._getTableControl();
				const oTableReportModel = this._getTableModel();
				const oTableReportData = oTableReportModel.getData();
				const oScreenModel = this._getScreenModel();
				const sWerks = oScreenModel.getProperty("/Plant");
				oTableReportData.push({
					OUTZ_KIDAI_NO: "",
					OUTSORTL: "",
					OUTMATNR: "",
					OUTWERKS: sWerks,
					OUTKOUBAI_IRAI_TYPE: "",
					OUTKOUBAI_IRAI_TYPEvalue: "", // 購買依頼タイプ 
					OUTBDMNG: "",
					OUTMEINS: "",
					OUTERFMG: "", // [数量] 
					Outerfme001: "", // 入力単位 
					OUTBDTER: "",
					OUTZ_TASK_CODE: "",
					OUTZ_SHUKKOSAKI: "",
					OUTZ_ZUBAN: "",
					OUTZ_POSITION_NO: "",
					OUTZ_PLNO: "",
					OUTZ_OYA_HINBAN: "",
					OUTZ_HOJO_HINBAN: "",
					OUTKZMPF: "",
					OUTRSNUM: "", //入出庫予定番号 
					OUTRSPOS: "", //入出庫予定明細番号 
					OUTPOSNR: "", //BOM明細番号 
					OUTENMNG: "0.000", // 引落数量 
					OUTHIKIATESUYO: "0.000", // 引当数量 
					Outrgekz001: false, // BF 
					OUTRSART: "",                  // レコードタイプ
					OUTAUFNR: "",                  // 指図番号
					OUTVORNR: "",                  // 活動番号
					OUTGYOKUBUN: "A",              // [行区分] 追加行
					OUTKOUBAI_IRAI_TYPE_PREV: "",  // 購買依頼タイプ（変更前）
					OUTSYS_STAT: "",               // システムステータス
					OUTUSR_STAT: "",               // ユーザステータス
					OUTBERID: sWerks,              // MRPエリア = プラント
					operation: "I",
					selected: true,
					insert: true,
				});
				oTableReportData.forEach((data, index) => {
					data.index = index + 1;
				});
				oTableReportModel.refresh();
				oTableControl.setFirstVisibleRow(oTableReportData.length - 1);
				this._refreshTotalRecord();
				this._clearMessages();
			},

			/**
			 * handle logic copy button
			 */
			onPressCopyButton: function () {
				const aMessages = [];
				const oTableReportModel = this._getTableModel();
				const aTableReportData = oTableReportModel.getData();
				const oTable = this._getTableControl();
				const oScreenModel = this._getScreenModel();
				const sWerks = oScreenModel.getProperty("/Plant");
				const aSelected = aTableReportData.filter((oRow) => oRow.selected);
				if (aSelected.length > 0) {
					const oRowBinding = oTable.getBinding("rows");
					const oList = oRowBinding.oList;
					const aIndices = oRowBinding.aIndices;
					const aTableSorted = [];
					aIndices.forEach((index) => {
						aTableSorted.push(oList[index]);
					});
					const aSelectedIndices = this._getSelectedIndices();
					let iLastIndex = oList.length;
					aSelectedIndices.forEach((iPos, index) => {
						const iUpdatePos = iPos + index;
						const oDataCopy = { ...aTableSorted[iUpdatePos] };
						const oNewData = {};
						oNewData.OUTZ_SHUKKO_JOUKYOU = oDataCopy.OUTZ_SHUKKO_JOUKYOU; // 出庫指示状況
						oNewData.OUTZ_KIDAI_NO = oDataCopy.OUTZ_KIDAI_NO; // 機台NO
						oNewData.OUTSORTL = oDataCopy.OUTSORTL; // 組立かたまり
						oNewData.OUTUSR02 = oDataCopy.OUTUSR02; // 要求ＮＯ
						oNewData.OUTMATNR = oDataCopy.OUTMATNR; // 品目
						oNewData.OUTWERKS = sWerks; // プラント
						oNewData.OUTMAKTX = oDataCopy.OUTMAKTX; // 品名
						oNewData.OUTKOUBAI_IRAI_TYPE = oDataCopy.OUTKOUBAI_IRAI_TYPE; // 調達タイプ
						oNewData.OUTKOUBAI_IRAI_TYPEvalue = oDataCopy.OUTKOUBAI_IRAI_TYPE; // 購買依頼タイプ 
						oNewData.OUTBDMNG = oDataCopy.OUTBDMNG; // 所要数量
						oNewData.OUTMEINS = oDataCopy.OUTMEINS; // 基本単位
						oNewData.OUTERFMG = oDataCopy.OUTERFMG; // 数量 
						oNewData.Outerfme001 = oDataCopy.Outerfme001; // 入力単位 
						oNewData.OUTBDTER = oDataCopy.OUTBDTER; // 所要日付
						oNewData.OUTZ_TASK_CODE = oDataCopy.OUTZ_TASK_CODE; // 出庫タスク
						oNewData.OUTZ_SHUKKOSAKI = oDataCopy.OUTZ_SHUKKOSAKI; // 出庫先
						oNewData.OUTZ_ZUBAN = oDataCopy.OUTZ_ZUBAN; // 図番
						oNewData.OUTZ_POSITION_NO = oDataCopy.OUTZ_POSITION_NO; // ポジション
						oNewData.OUTZ_PLNO = oDataCopy.OUTZ_PLNO; // PL
						oNewData.OUTZ_OYA_HINBAN = oDataCopy.OUTZ_OYA_HINBAN; // 親品番
						oNewData.OUTZ_HOJO_HINBAN = oDataCopy.OUTZ_HOJO_HINBAN; // 補助品番
						oNewData.OUTZ_SHORI_NO = oDataCopy.OUTZ_SHORI_NO; // 処理NO
						oNewData.OUTLGORT = oDataCopy.OUTLGORT; // 保管場所
						oNewData.OUTLGORTvalue = oDataCopy.OUTLGORT; // 保管場所 
						oNewData.Outrgekz001 = oDataCopy.Outrgekz001; // BF 
						oNewData.OUTZ_JITSUSHUKKO_NO = oDataCopy.OUTZ_JITSUSHUKKO_NO; // 実出庫NO
						oNewData.OUTRSNUM = ""; // 入出庫予定番号 
						oNewData.OUTRSPOS = ""; // 入出庫予定明細番号 
						oNewData.OUTPOSNR = ""; // BOM明細番号 
						oNewData.OUTENMNG = "0.000"; // 引落数量 
						oNewData.OUTHIKIATESUYO = "0.000"; // 引当数量 
						oNewData.selected = true;
						oNewData.OUTGYOKUBUN = "A"; // [行区分] 追加行 (複写)
						oNewData.operation = "I";
						oNewData.insert = true;
						oNewData.index = ++iLastIndex;
						oNewData.OUTKZMPF = "";
						aTableSorted.splice(iUpdatePos + 1, 0, oNewData);
					});

					oTableReportModel.setData(aTableSorted);
					this._refreshTotalRecord();
				} else {
					const oMessage = {
						type: "Error",
						title: this.oBundle.getText("ErrorTitle"),
						description: this.oBundle.getText("Error004"),
						subtitle: this.oBundle.getText("Error004"),
						counter: 1,
					};
					aMessages.push(oMessage);
					this._resetMessages({ aMessages, oMessage });
					return;
				}
			},

			/**
			 * onpressDelete
			 */
			onPressDeleteButton: function () {
				this._clearMessages();
				const oTableReportModel = this._getTableModel();
				const oTableReportData = oTableReportModel.getData();

				const aSelected = oTableReportData.filter((item) => item.selected);

				if (aSelected.length === 0) {
					const oMessage = {
						type: "Error",
						title: this.oBundle.getText("ErrorTitleNoSelect"),
						description: this.oBundle.getText("noTargetErrorContent"),
						subtitle: this.oBundle.getText("noTargetErrorContent"),
						counter: 1,
					};
					// Keep 追加行 as 'A' so it can be removed from the table instead of flagged
					aSelected.forEach((item) => {
						item.operation = item.operation === "I" ? "I" : "D";
						item.OUTGYOKUBUN = item.OUTGYOKUBUN === "A" ? "A" : "D"; // [行区分] 削除行
					});
					this._resetMessages({ aMessages: [oMessage], oMessage });
					return;
				} else {
					aSelected.forEach((item) => (item.operation = item.operation === "I" ? "I" : "D"));
					this.aDeleteList = [...this.aDeleteList, ...aSelected];
					for (let i = oTableReportData.length - 1; i >= 0; i--) {
						const item = oTableReportData[i];
						if (item.selected && item.operation === "I") {
							oTableReportData.splice(i, 1);
						}
						item.selected = false;
					}

					oTableReportModel.refresh();
				}

				this._getScreenModel().setProperty("/bCheckAll", false);
				oTableReportModel.refresh();
				this._refreshTotalRecord();
			},

			/**
			 * Handle set operation for Delete row
			 */
			_handleDeleteRowChecked: function (aRows) {
				// filter item have operation = Delete
				const newData = aRows.filter((oRow) => oRow.operation !== "I" && !oRow.selected);
				const deleteCurrent = aRows.filter((oRow) => oRow.operation === "D" && !oRow.insert);
				this.aDeleteList = [...this.aDeleteList, ...deleteCurrent];
				return {
					results: newData,
				};
			},

			/**
			 * Reset "operation" field to no value after update DB
			 */
			_resetOperation: function () {
				const oTableReportModel = this._getTableModel();
				this._getTableModel()
					.getData()
					.forEach(function (oRowData) {
						if (oRowData.operation) {
							delete oRowData.operation;
						}
						if (oRowData.selected) {
							delete oRowData.selected;
						}
					});
				this._getTableControl().clearSelection();
				oTableReportModel.refresh();
				return Promise.resolve();
			},

			// *** HANDLE EVENT OF CHECKBOX *** //
			/* Handle Check All */
			onCheckAllToggle: function (oEvent) {
				const oTable = this._getTableControl();
				const oTableContext = this._getTableContextData(oTable);
				const bSelected = oEvent.getParameter("selected");

				oTableContext.forEach((oContextItem) => {
					if (bSelected) {
						if (oContextItem?.operation !== "D" && oContextItem.flagStatus !== "P") {
							oContextItem.selected = oContextItem.operation === "I" || !oContextItem?.Outunchangeflg001;
							oContextItem.operation = oContextItem.operation || "U";
						}
					} else {
						oContextItem.selected = false;
					}
				});
				this._getTableModel().refresh();
			},

			/**
			 * Handle Auto select checkbox when has a change
			 * @param {Event} oEvent
			 */
			onAutoSelectCheckbox: function (oEvent) {
				const oRow = this._getORowData(oEvent);
				const oTable = this._getTableControl();
				const oInput = oEvent.getSource();
				oRow.selected = true;
				if (oRow.operation !== "I") {
					oRow.operation = "U";
				}
				if (oInput.getValueState() === "Error") {
					oInput.setValueState("None");
					oInput.setValueStateText("");
				}
				if (oInput.getId().includes("OUTBDTER")) {
					const bValidDate = oInput.isValidValue();
					if (!bValidDate) {
						oRow["valueStateOUTBDTER"] = ValueState.Error;
						oRow["valueStateTextOUTBDTER"] = this.oBundle.getText("ErrorDate");
					} else {
						oRow["valueStateOUTBDTER"] = ValueState.None;
						oRow["valueStateTextOUTBDTER"] = "";

					}
				}
				const oTableContext = this._getTableContextData(oTable);

				const allSelected = oTableContext
					.filter((item) => item.operation !== "D")
					.every((oContextItem) => {
						return oContextItem.flagDisable || oContextItem.selected;
					});

				this._getScreenModel().setProperty("/bCheckAll", allSelected);
				this._getTableModel().refresh();
			},

			/**
			 * change operation in the row
			 */
			onChangeOperation: function (oEvent) {
				const oRow = this._getORowData(oEvent);
				const oTable = this._getTableControl();
				const oTableContext = this._getTableContextData(oTable);
				const bSlected = oEvent.getSource().getProperty("selected");

				if (bSlected) {
					if (oRow.operation !== "I") {
						oRow.operation = "U";
					} else {
						oRow.operation = "I";
					}
				} else {
				}

				const allSelected = oTableContext
					.filter((item) => item.operation !== "D")
					.every((oContextItem) => {
						return oContextItem.flagDisable || oContextItem.selected;
					});
				this._getScreenModel().setProperty("/bCheckAll", allSelected);
			},

			/**
			 * remove event default of cell click in table
			 */
			onCellClick: function (oEvent) {
				oEvent.preventDefault();
			},

			/**
			 * handle add selection in the table
			 */
			_handleAddSelectionInterval: function () {
				const aData = this._getTableModel().getData();
				const oTable = this._getTableControl();
				const oRowBinding = oTable.getBinding("rows");

				const oList = oRowBinding.oList;
				const aIndices = oRowBinding.aIndices;
				aData.forEach((oRow) => {
					if (oRow.selected) {
						const iItemIndex = oList.findIndex((oData) => oData.index === oRow.index);
						const iItemPosition = aIndices.findIndex((index) => index === iItemIndex);
						oTable.addSelectionInterval(iItemPosition, iItemPosition);
					}
					
				});
			},

			// *** HANDLE CELL EDIT *** //
			/**
			 * handle get data for 調達タイプ from 品目 and プラント
			 */
			onProcurementTypeChange: function (oEvent) {
				const oRow = this._getORowData(oEvent);
				if (!oRow.OUTKOUBAI_IRAI_TYPEvalue && oRow.OUTMATNR && oRow.OUTWERKS) {
					const sPath = `SuggestForPurTypeSet(INMATNR='${oRow.OUTMATNR}',INWERKS='${oRow.OUTWERKS}')`;
					this._readOData([], sPath).then(
						function (oData) {
							oRow.OUTKOUBAI_IRAI_TYPE = oData.OUTKOUBAI_IRAI_TYPE;
							oRow.OUTKOUBAI_IRAI_TYPEvalue = oData.OUTKOUBAI_IRAI_TYPE;
							oRow.valueStatePurchaseRequisitionType = ValueState.None;
							this._getTableModel().refresh();
						}.bind(this)
					);
				}
			},

			/**
			 * Handle get data for 所要日付
			 */
			onChangeOutboundTask: function (oEvent) {
				const oRow = this._getORowData(oEvent);
				const sValue = oEvent.getSource().getValue();
				if (oRow.OUTZ_KIDAI_NO && oRow.OUTWERKS && sValue) {
					const sOUTZ_KIDAI_NO = oRow.OUTZ_KIDAI_NO.replaceAll(" ", "%20");
					const sOUTWERKS = oRow.OUTWERKS.replaceAll(" ", "%20");
					const sOUTZ_TASK_CODE = sValue.replaceAll(" ", "%20");
					const sPath = `SuggestForBdterSet(Z_KIDAI_NO='${sOUTZ_KIDAI_NO}',INWERKS='${sOUTWERKS}',Z_TASK_CODE='${sOUTZ_TASK_CODE}')`;
					this._readOData([], sPath).then(
						function (oData) {
							oRow.OUTBDTER = oData.OUTBDTER;
							oRow.valueStateOUTBDTER = ValueState.None;
							this._getTableModel().refresh();
						}.bind(this)
					);
				}
			},

			/**
			 * handle onChange Storage Area
			 */
			onChangeStgLocationSet: function (oEvent) {
				const oSelectedItem = oEvent.getSource().getSelectedItem();
				if (!oSelectedItem) {
					return;
				}
				const sWerks = oSelectedItem.getBindingContext("StorageLocationModel").getObject().Werks;
				const oScreenModel = this._getScreenModel();

				// If プラント is blank, get it from 保管場所.
				if (sWerks && !oScreenModel.getProperty("/Plant")) {
					oScreenModel.setProperty("/Plant", sWerks);
					oScreenModel.setProperty("/valueStatePlant", ValueState.None);
					oScreenModel.setProperty("/valueStateTextPlant", "");
				}
			},			

			/**
			 * Handle on live change Input Amount Of Money
			 * @param {*} oEvent
			 */
			onAmountOfMoneyChange: function (oEvent) {
				const oInput = oEvent.getSource();

				// Automatically check the checkbox when the value is changed.
				this.onAutoSelectCheckbox(oEvent);

				if (oInput.getValueState() === "Error") {
					oInput.setValueState("None");
					oInput.setValueStateText("");
				}
				const sInputValue = oEvent.getParameter("value");
				const oRow = oInput.getBindingContext("oDataTable").getObject();
				const bCurrencyHasDecimal = false;

				// Init cursor position
				const oDomRef = oEvent.getSource().getFocusDomRef();
				let iCursorPosition = oDomRef.selectionStart;

				// If empty -> return ""
				if (!sInputValue) {
					oDomRef.onchange = this._handleOnAmountAndCurrencyChange(oRow);
					oInput.setValue("");
					oRow["OUTERFMG"] = "";
					return;
				}

				let sParseValue = "";
				if (bCurrencyHasDecimal) {
					sParseValue = sInputValue.replace(/[^0-9.-]/g, "");
				} else {
					sParseValue = sInputValue.replace(/[^0-9-]/g, "");
				}
				const bNegativeValue = sParseValue.indexOf("-") !== -1;

				let [sFirstValue, sSecondValue] = sParseValue.replaceAll("-", "").split(".");

				// // Handle a value before "."
				if (sFirstValue) {
					let sParse = BigInt(sFirstValue);
					sFirstValue = sParse.toLocaleString("en-US");
				}

				// // Handle a value after "."
				if (sSecondValue !== undefined && sFirstValue !== "") {
					sSecondValue = "." + sSecondValue;
				} else {
					sSecondValue = "";
				}

				let sResultValue = sFirstValue + sSecondValue;
				if (bNegativeValue) {
					sResultValue = "-" + sResultValue;
				}

				// Set value to input field
				oInput.setValue(sResultValue);

				// set cursor for input
				if (sResultValue.length <= sInputValue.length) {
					if (sInputValue.length - sResultValue.length === 1) {
						oDomRef.setSelectionRange(iCursorPosition - 1, iCursorPosition - 1);
					} else {
						oDomRef.setSelectionRange(iCursorPosition, iCursorPosition);
					}
				} else {
					oDomRef.setSelectionRange(iCursorPosition + 1, iCursorPosition + 1);
				}

				// Set output to odata field
				const iResultLength = sResultValue.length;
				if (sResultValue[iResultLength - 1] === ".") {
					sResultValue = sResultValue.substring(0, iResultLength - 1);
				}

				oRow["OUTERFMG"] = sResultValue.replaceAll(",", "");
				oDomRef.onchange = this._handleOnAmountAndCurrencyChange(oRow);
			},

			// Handle formatting amount when the input loses focus
			_handleOnAmountAndCurrencyChange: function (oRow) {
				return async function () {
					// Refresh model
					this._getTableModel().refresh();
				}.bind(this);
			},

			// *** HANDLE REFLECT BUTTON *** //
			/**
			 * Toggle display reflection component
			 */
			onToggleReflectingButton: function (oEvent) {
				const oButton = oEvent.getSource();
				const sButtonText = oButton.getText();
				const sDisplayText = this.oBundle.getText("btnCollpaseOpen");
				const sHiddenText = this.oBundle.getText("btnCollpaseClose");
				const oReflectComponent = this.byId("_IDGenSimpleForm");
				if (sButtonText === sDisplayText) {
					oButton.setText(sHiddenText);
					oReflectComponent.removeStyleClass("displayNone");
				} else {
					oButton.setText(sDisplayText);
					oReflectComponent.addStyleClass("displayNone");
				}
			},

			/**
			 * Handle change on a 一括入力 field
			 */
			onChangeBatchInputField: function (oEvent) {
				const sId = oEvent.getSource().getId().split("--").pop();
				const oField = Constants.BatchInputFields.find((oItem) => oItem.controlId === sId);
				if (oField) {
					this._getScreenModel().setProperty(`/select${oField.key}`, true);
				}
			},

			/**
			 * Handle validation
			 */
			onChangeRequiredDateBatchInput: function (oEvent) {
				const oRequiredDateControl = oEvent.getSource();
				const sValue = oRequiredDateControl.getValue();

				this.onChangeBatchInputField(oEvent);

				Validator._controlValidations(oRequiredDateControl, "", "", [
					{
						fnCheck: () => !sValue || Validator.isDateString(sValue),
						sMessage: this.oBundle.getText("ErrorDate"),
					},
				]);
			},

			/**
			 * Handle press reflection button
			 */
			onPressReflectionButton: async function () {
				const aMessages = [];
				const oTable = this._getTableControl();
				const oScreenModel = this._getScreenModel();
				const aTableContext = this._getTableContextData(oTable);
				const oRequiredDateControl = this._getControlById("BULKBDTER");

				const aSelectedFields = Constants.BatchInputFields.filter(
					(oField) => oScreenModel.getProperty(`/select${oField.key}`) === true
				);
				const aSelectedRows = aTableContext.filter((oItem) => oItem.selected);

				if (!aSelectedFields.length) {
					aMessages.push(Message.createErrorMessage(this.oBundle.getText("ERROR007")));
					return this._resetMessages({ aMessages });
				}

				if (!aSelectedRows.length) {
					aMessages.push(Message.createErrorMessage(this.oBundle.getText("ERROR006")));
					return this._resetMessages({ aMessages });
				}

				const sRequiredDate = oScreenModel.getProperty("/ValueRequiredDate");
				const aResult = Validator._controlValidations(oRequiredDateControl, "", "", [
					{
						fnCheck: () => !sRequiredDate || Validator.isDateString(sRequiredDate),
						sMessage: this.oBundle.getText("ErrorDate"),
					},
				]);
				if (aResult.length) {
					return;
				}

				const bRequiredDateSelected = aSelectedFields.some((oField) => oField.key === "RequiredDate");

				for (const oItem of aSelectedRows) {
					if (oItem.Outunchangeflg001) {
						continue;
					}

					let bOutboundTaskReflected = false;

					aSelectedFields.forEach((oField) => {
						if (oField.insertOnly && oItem.operation !== "I") {
							return;
						}
						if (oField.key === "PurchaseRequisitionType" && parseFloat(oItem.OUTENMNG) !== 0) {
							return;
						}

						const sValue = oScreenModel.getProperty(`/Value${oField.key}`) ?? "";
						oItem[oField.output] = sValue;

						if (oField.key === "StorageLocation") {
							oItem.OUTLGORT = sValue;
						}
						if (oField.key === "PurchaseRequisitionType") {
							oItem.OUTKOUBAI_IRAI_TYPEvalue = sValue;
						}
						if (oField.key === "OutboundTask") {
							bOutboundTaskReflected = true;
						}
					});

					if (bOutboundTaskReflected && !bRequiredDateSelected) {
						await this._fetchRequiredDateForRow(oItem);
					}

					oItem.operation = oItem.operation === "I" ? oItem.operation : "U";
				}

				this._resetMessages({ aMessages: [] });
				this._getTableModel().refresh();
			},

			/**
			 * Fetch [所要日付] by [出庫タスク] + [機台NO] + [プラント]
			 */
			_fetchRequiredDateForRow: function (oRowData) {
				if (!oRowData.OUTZ_KIDAI_NO || !oRowData.OUTWERKS || !oRowData.OUTZ_TASK_CODE) {
					return Promise.resolve();
				}

				BusyIndicator.show(0);
				const sKidaiNo = oRowData.OUTZ_KIDAI_NO.replaceAll(" ", "%20");
				const sWerks = oRowData.OUTWERKS.replaceAll(" ", "%20");
				const sTaskCode = oRowData.OUTZ_TASK_CODE.replaceAll(" ", "%20");
				const sPath = `SuggestForBdterSet(Z_KIDAI_NO='${sKidaiNo}',INWERKS='${sWerks}',Z_TASK_CODE='${sTaskCode}')`;

				return this._readOData([], sPath)
					.then((oData) => {
						oRowData.OUTBDTER = oData.OUTBDTER;
						oRowData.valueStateOUTBDTER = ValueState.None;
					})
					.catch(() => {})
					.finally(() => BusyIndicator.hide());
			},

			// *** HANDLE EXCEL *** //
			/**
			 * Handle on press download button — EXCELダウンロード
			 */
			onPressDownloadButton: function () {
				const oTable = this._getTableControl();
				const aDataSource = this._getTableContextData(oTable);
				const aCols = excel.createColumnConfig(oTable);
				const oFormatItems = {
					aDateItems: Constants.DateColumns,
				};
				excel.handleDownloadExcel(aDataSource, aCols, oFormatItems, Constants.PROGRAM_ID);
			},

			/* Handle Press Download Format Import */
			onPressDownloadFormatExcel: function (oEvent) {
				this._clearMessages();
				const oTable = this._getTableControl();
				const aContext = this._getTableContextData(oTable);
				const aColumns = oTable?.getColumns();
				const aPurType     = this._getListByModelName("PurchaseReqTypeModel");
				const aStgLocation = this._getListByModelName("StorageLocationModel");		

				const aWorkBook = [];
				const aColWidth = [];

				if (aContext.length === 0) {
					const oMessage = {
						type: "Error",
						title: this.oBundle.getText("ErrorTitle"),
						description: this.oBundle.getText("ErrorExport"),
						subtitle: this.oBundle.getText("ErrorExport"),
						counter: 1,
					};
					this._resetMessages({ aMessages: [oMessage], oMessage });
					return;
				}

				const aExportItem = aContext?.filter((oItem) => oItem?.operation !== "I" && oItem?.operation !== "D");

				// Format data field
				const aDataFormart =
					aExportItem?.map((item) => ({
						...item,
						OUTZ_SHUKKO_JOUKYOU: item?.OUTZ_SHUKKO_JOUKYOU ? "済" : "未",
						OUTBDTER: common._formatDateToYMD(item?.OUTBDTER),
						Outrgekz001: item?.Outrgekz001 === true ? "X" : "",
					})) || [];

				// Init columns label names
				const aColumnName = aColumns
					?.map((item) => {
						return item.getName() || "";
					})
					.slice(1);
				// Add hidden column to column
				aColumnName?.push(...Constants.HiddenColumns);

				// Init columns data names
				const aColumnProps = aColumns
					?.map((item) => {
						return item.getSortProperty().replace("Sort", "") || "";
					})
					.slice(1);
				// Add hidden column data to column dataa
				aColumnProps?.push(...Constants.HiddenColumnsData);

				// Set Excel width
				aColumnName.forEach((sColumnName) => {
					aColWidth.push({ wch: sColumnName.length + 20 });
				});

				// Format add color to disable columns
				aDataFormart?.forEach((oContextItem) => {
					const aRowItems = [];
					// Handle disabling [購買依頼タイプ] when [引落数量] equals 0
					const aDisableColumns = [...Constants.DisableColumns];
					if (oContextItem.OUTENMNG !== "0" && oContextItem.OUTENMNG !== "0.000") {
						aDisableColumns.push("購買依頼タイプ");
					}

					for (let i = 0; i < aColumnName.length; i++) {
						const bIsHidden = Constants.HiddenColumns.includes(aColumnName[i]);
						const bUnInputItem = aDisableColumns.includes(aColumnName[i]);

						// Init common cell props
						let oCellProps = {
							v: oContextItem[aColumnProps[i]],
							t: aColumnName[i],
						};

						const bFillColor = {
							fill: {
								fgColor: { rgb: "E9E9E9" },
							},
							border: {
								top: { style: "thin", color: { rgb: "D9D9D9" } },
								right: { style: "thin", color: { rgb: "D9D9D9" } },
								bottom: { style: "thin", color: { rgb: "D9D9D9" } },
								left: { style: "thin", color: { rgb: "D9D9D9" } },
							},
						};

						if (oContextItem.Outunchangeflg001 || bIsHidden || bUnInputItem) {
							oCellProps = {
								...oCellProps,
								s: bFillColor,
							};
						}
						aRowItems.push(oCellProps);
					}
					aWorkBook.push(aRowItems);
				});

				const workSheet = XLSX.utils.json_to_sheet(aWorkBook);
				const workBook = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(workBook, workSheet, this.oBundle.getText("appTitle"));

				let a = XLSX.utils.sheet_add_aoa(workSheet, [aColumnName], {
					origin: "A1",
				});

				const sCommentPurType = aPurType.reduce((sAccumulator, oItem) => {
					if (!oItem.Code) {
						return sAccumulator + `\r\n`;
					} else {
						return sAccumulator + `${oItem?.Code || ""} : ${oItem?.Text || ""}\r\n`;
					}
				}, `${Constants.UsageGuideTitle}\r\n`);

				// Title保管場所
				const sStgLocationSet = aStgLocation.reduce((sAccumulator, oItem) => {
					if (!oItem.Lgort) {
						return sAccumulator + `\r\n`;
					} else {
						return sAccumulator + `${oItem?.Lgort || ""} : ${oItem?.Name1 || ""}\r\n`;
					}
				}, `${Constants.UsageGuideTitle}\r\n`);

				// Init cell comment
				const aKeys = Object.keys(workSheet);
				aKeys?.forEach((sKey) => {
					if (sKey !== "!ref" && sKey !== "!ref") {
						if (a[sKey]?.v === this.oBundle.getText("headerPurchaseRequisitionType")) {
							if (!a[sKey].c) {
								a[sKey].c = [];
							}
							a[sKey].c.hidden = true;
							a[sKey].c.push({ a: "購買依頼タイプ", t: sCommentPurType });
						}

						// Title 保管場所
						if (a[sKey]?.v === this.oBundle.getText("headerStorageLocation")) {
							if (!a[sKey].c) {
								a[sKey].c = [];
							}
							a[sKey].c.hidden = true;
							a[sKey].c.push({ a: "保管場所", t: sStgLocationSet });
						}
					}
				});

				const optionsMaxLength = Math.max(aPurType.length, aStgLocation.length);
				let purTypeList = [["購買依頼タイプ"]];
				let locationSetList = [["保管場所"]];

				for (let i = 0; i < optionsMaxLength; i++) {
					if (typeof aPurType[i] !== "undefined" && aPurType[i].Code !== "") {
						purTypeList.push([aPurType[i].Code, aPurType[i].Text]);
					}
					if (
						typeof aStgLocation[i] !== "undefined" &&
						aStgLocation[i].Lgort !== ""
					) {
						locationSetList.push([aStgLocation[i].Lgort, aStgLocation[i].Name1]);
					}
				}

				const usageGuide = [[`【${Constants.UsageGuideTitle}】`], [], ...purTypeList, [], ...locationSetList];

				//add workSheet Tutorial
				const workSheet2 = XLSX.utils.aoa_to_sheet(usageGuide);
				XLSX.utils.book_append_sheet(workBook, workSheet2, Constants.UsageGuideTitle);

				//generate file xlsx
				XLSX.writeFile(workBook, `${this.oBundle.getText("nameFile")}_${common._getCurrentDate()}.xlsx`, {
					compression: true,
				});
			},

			//  Handle Press Import File 
			onPressImportFile: function (oEvent) {
				this._clearMessages();

				const aFiles = oEvent.getParameter("files");

				if (aFiles && aFiles.length > 0) {
					const oFile = aFiles[0];
					if (oFile.type === Constants.XLSXType) {
						this._processExcelFile(oFile);
					}
				} else {
					const aMessages = [];
					const oMessage = {
						type: "Error",
						title: this.oBundle.getText("ErrorTitle"),
						description: this.oBundle.getText("ErrorExport"),
						subtitle: this.oBundle.getText("ErrorExport"),
						counter: 1,
					};
					aMessages.push(oMessage);
					this._resetMessages({ aMessages, oMessage });
				}
			},

			/**
			 * Handle file type mismatch on the EXCEL取込 FileUploader
			 * 項目ﾁｪｯｸ基準書 No.19 — 入力ファイルがExcelファイルでない場合
			 */
			onTypeMissMatch: function () {
				const aMessages = [Message.createErrorMessage(this.oBundle.getText("ErrorExport"))];
				return this._resetMessages({ aMessages });
			},

			// Handle Read File Excecl 
			_processExcelFile: function (oFile) {
				let aResultCompare = [];
				const oTable = this._getTableControl();
				const aContext = this._getTableContextData(oTable);
				const aTableColumns = oTable.getColumns();
				const fReader = new FileReader();
				BusyIndicator.show(0);
				const self = this;
				fReader.onload = async function (e) {
					let binaryData = e.target.result;
					let workBook = XLSX.read(binaryData, {
						type: "binary",
						raw: false,
						dateNF: "yyyy/mm/dd",
					});
					let aExcelData = [];

					// Extract sheet data
					workBook?.SheetNames?.forEach(function (sheetname) {
						if (sheetname === self.oBundle.getText("appTitle")) {
							aExcelData = XLSX.utils.sheet_to_row_object_array(workBook.Sheets[sheetname], {
								raw: false,
							});
						}
					});

					const oHiddenColumn = {
						"(編集不可フラグ)": "Outunchangeflg001",
						"(入出庫予定)": "OUTRSNUM",
						"(明細番号)": "OUTRSPOS",
					};

					const aColumnExcel = [];
					aExcelData?.map((item) => {
						Object.keys(item)?.forEach((key) => {
							if (!aColumnExcel.hasOwnProperty(key)) {
								aColumnExcel[key] = item[key];
							}
						});
					});

					if (aExcelData?.length > 0) {
						const aHeaders = Object.keys(aColumnExcel);
						let oBindingList = {};

						aHeaders?.forEach((sHeaderItem) => {
							aTableColumns?.forEach((oColumn) => {
								const sLabel = oColumn.getName() || "";
								if (sLabel === sHeaderItem) {
									let sBindingPath = oColumn.getSortProperty().replace("Sort", "") || "";
									oBindingList = {
										[sLabel]: sBindingPath,
										...oBindingList,
										...oHiddenColumn,
									};
								}
							});
						});

						const aResult = aExcelData?.map((item) => {
							const oRecord = {};
							aHeaders.forEach((sHeader) => {
								const sBindingProp = oBindingList[sHeader] || "";
								oRecord[sBindingProp] = item[sHeader];
							});

							oRecord["index"] = +oRecord["index"] || "";
							oRecord["selected"] = true;
							oRecord["operation"] = "I";

							return oRecord;
						});
						//compare Data
						if (aContext?.length > 0) {
							aResultCompare = await self.handleCompareData(aContext, aResult);
						} else {
							aResultCompare = aResult;
						}

						const aNewData = aResultCompare?.map((item) => ({
							...item,
							OUTBDTER:
								common.getFullDate(item?.OUTBDTER)?.replace(/[^0-9]/g, "") ||
								item?.OUTBDTER ||
								"",
							OUTZ_SHUKKO_JOUKYOU: item?.OUTZ_SHUKKO_JOUKYOU === "済" ? "X" : "",
							OUTLGORTvalue: item?.OUTLGORT || "",
							OUTKOUBAI_IRAI_TYPEvalue: item?.OUTKOUBAI_IRAI_TYPE || "",
						}));

						// Perform validation before calling _setResult(), before numbers/flags are formatted, to preserve the original invalid value.
						const aImportMessages = await self._runRowValidations(aNewData, true);
						self._setResult({ results: aNewData }, false);
						self._getTableModel().refresh();

						// Import errors only highlight fields + list in the Message, NO confirmation popup for this case
						self._resetMessages({ aMessages: aImportMessages }, false, true);
						BusyIndicator.hide();
					} else {
						self._setTableData([]);
						self._getTableModel().refresh();
						BusyIndicator.hide();
						const aMessages = [];
						const oMessage = {
							type: "Error",
							title: self.oBundle.getText("ErrorTitle"),
							description: self.oBundle.getText("ErrorExport"),
							subtitle: self.oBundle.getText("ErrorExport"),
							counter: 1,
						};
						aMessages.push(oMessage);
						self._resetMessages({ aMessages, oMessage });
					}
				};

				fReader.readAsBinaryString(oFile);
			},

			handleCompareData: function (aDataTable, aDataExcel) {
				let aDisableEdit = [...Constants.HiddenColumnsData, ...Constants.DisableColumnsData];
				const aOrgDisableEdit = [...aDisableEdit]; 
				const aResultCompate = [];
				const oTable = this._getTableControl();
				const aColumn = oTable.getColumns();

				const aColumnProps = aColumn
					?.filter((item) => item.getName())
					?.map((ele) => {
						return ele?.getSortProperty().replace("Sort", "") || "";
					});

				aColumnProps.push("OUTRSNUM", "OUTRSPOS", "Outunchangeflg001", "selected", "operation");

				const arr1 = mapPingData(aDataTable);
				const arr2 = mapPingData(aDataExcel);

				for (let i = 0; i < arr1?.length; i++) {
					const currentIndex = arr1[i]["index"];
					const oMatchingItem = arr2?.find((item) => +item.index === currentIndex);

					if (oMatchingItem) {
						// Handle un update [購買依頼タイプ] when [引落数量] equals 0
						if (oMatchingItem.OUTENMNG !== "0" && oMatchingItem.OUTENMNG !== "0.000") {
							aDisableEdit = [...aDisableEdit, "OUTKOUBAI_IRAI_TYPE"];
						} else {
							aDisableEdit = aOrgDisableEdit;
						}
						// un updata data column disable
						aDisableEdit.forEach((eleColumn) => {
							oMatchingItem[`${eleColumn}`] = arr1[i]?.[eleColumn] || "";
						});
						// un updata data column disable
						if (arr1[i].Outunchangeflg001 === "X") {
							let aKeyMatching = Object.keys(oMatchingItem);
							aKeyMatching?.forEach((ele) => {
								oMatchingItem[`${ele}`] = arr1[i]?.[ele] || "";
							});
						}

						const oMatchingItemString = mapPingDataEdit(oMatchingItem);
						const oItemContextString = mapPingDataEdit(arr1[i]);

						if (JSON.stringify(oMatchingItemString) !== JSON.stringify(oItemContextString)) {
							oMatchingItem.operation = "U";
							oMatchingItem.selected = true;
						} else {
							((oMatchingItem.operation = arr1[i]["operation"]),
								(oMatchingItem.selected = arr1[i]["selected"] || false));
						}

						aResultCompate.push(oMatchingItem);
					}
				}

				aResultCompate?.forEach((item) => {
					const currentItem = arr2?.find((ele) => ele?.index === item?.index);
					if (currentItem) {
						const indexOf = arr2.indexOf(currentItem);
						if (indexOf) {
							arr2?.splice(indexOf, 1, item);
						}
					}
				});

				return arr2;

				function mapPingData(aData) {
					return (
						aData
							?.filter((oData) => {
								return aColumnProps.some((sField) => {
									return !!oData[sField];
								});
							})
							?.map((oData) => {
								let oNewOdata = {};
								aColumnProps.forEach((sField) => {
									oNewOdata[sField] = oData[sField] || "";
								});
								return oNewOdata;
							}) || []
					);
				}

				function mapPingDataEdit(adata) {
					let obj = {};

					for (const key in adata) {
						if (!aDisableEdit.includes(key)) {
							obj[key] = adata[key];
							obj["OUTBDTER"] = adata["OUTBDTER"]?.replace(/[^0-9]/g, "") || "";
						}
					}
					(delete obj.selected, delete obj.operation);

					return obj;
				}
			},

			// *** HANDLE REGISTER *** //
			/**
			 * Event handling when Save button pressed
			 */
			onPressRegisterButton: Debounce(function () {
				this._clearMessages();
				BusyIndicator.show(0);
				// check data before save
				this._checkData()
					// update DB
					.then(this._updateOData.bind(this))
					// output success messages
					.then(this._outputSuccessMessages.bind(this))
					// clear deletion list
					.then(this._initDeleteList.bind(this))
					// when error occurs in above process, output error messages
					.catch(this._resetMessages.bind(this))
					.finally(() => BusyIndicator.hide());
			}, 500),

			/**
			 * Check data before making registration
			 */
			_checkData: async function () {
				const aDelete = this.aDeleteList || [];
				const aTableData = this._getTableModel().getData();
				const aTableSelectedData = aTableData.filter((oRow) => oRow.selected);
				const { aUpdate, aInsert } = this._handleDistinctionAddAndUpdate(aTableSelectedData);

				let bCellValueOK = true;
				let bDateCellsHasDate = true; // Fix: initialize as true to avoid treating "no date cells" as mandatory error - 20260429
				let aFieldsCheck = [];
				const aFieldsCheckUpdate = [
					"OUTSORTL",
					"OUTKOUBAI_IRAI_TYPE",
					"OUTZ_TASK_CODE",
					"OUTZ_SHUKKOSAKI",
					"OUTZ_ZUBAN",
					"OUTERFMG", // [数量] 
					"Outerfme001", // [入力単位] 
				];
				const aFieldsCheckInsert = [
					"OUTZ_KIDAI_NO",
					"OUTSORTL",
					"OUTMATNR",
					"OUTWERKS",
					"OUTKOUBAI_IRAI_TYPE",
					"OUTERFMG", // [数量] 
					"Outerfme001", // [入力単位] 
					"OUTZ_TASK_CODE",
					"OUTZ_SHUKKOSAKI",
					"OUTZ_ZUBAN",
					"OUTZ_POSITION_NO",
					"OUTZ_PLNO",
					"OUTZ_OYA_HINBAN",
					"OUTZ_HOJO_HINBAN",
				];

				const FIELD_LABEL_KEY_MAP = {
					OUTSORTL: "headerAssemblyGroup",
					OUTKOUBAI_IRAI_TYPE: "headerPurchaseRequisitionType",
					OUTZ_TASK_CODE: "headerGoodsIssueTask",
					OUTZ_SHUKKOSAKI: "headerDeliveryDestination",
					OUTZ_ZUBAN: "headerDrawingNumber",
					OUTERFMG: "headerInputQuantity",
					Outerfme001: "headerInputUnit",
					OUTZ_KIDAI_NO: "headerMachineNo",
					OUTMATNR: "headerItem",
					OUTWERKS: "headerPlant",
					OUTZ_POSITION_NO: "headerPosition",
					OUTZ_PLNO: "headerPL",
					OUTZ_OYA_HINBAN: "headerParentPartNumber",
					OUTZ_HOJO_HINBAN: "headerAuxiliaryPartNumber",
					OUTBDTER: "headerRequiredDate",
				};

				const aRequiredErrorDetails = [];
				aTableSelectedData.forEach(
					function (oRow) {
						switch (oRow.operation) {
							case "U":
								aFieldsCheck = [...aFieldsCheckUpdate];
								break;
							case "I":
								aFieldsCheck = [...aFieldsCheckInsert];
								break;
							default:
								break;
						}
						// Check validate fields
						const { bResult, aErrorFields } = this._handleCheckValidateCell(oRow, aFieldsCheck);
						bCellValueOK = bCellValueOK && bResult;

						aErrorFields.forEach((sField) => {
							aRequiredErrorDetails.push({
								iRowNo: oRow.index,
								sFieldLabel: this.oBundle.getText(FIELD_LABEL_KEY_MAP[sField] || sField),
							});
						});
					}.bind(this)
				);
				// refresh screen for valueState and valueStateText
				this._getTableModel().refresh();
				// if any check error occurs, output error message
				const aRequiredMessages = aRequiredErrorDetails.map((oDetail) => ({
					type: "Error",
					title: this.oBundle.getText("ErrorTitle"),
					description: this.oBundle.getText("ERROR001VALID", [oDetail.iRowNo, oDetail.sFieldLabel]),
					subtitle: this.oBundle.getText("ERROR001VALID", [oDetail.iRowNo, oDetail.sFieldLabel]),
					counter: 1,
				}));

				// Register must reuse the same 5-group validation (Length, Number, Select, Date, Flag) defines for Excel import
				const aRegisterMessages = await this._runRowValidations(aTableSelectedData);
				this._getTableModel().refresh();

				const aAllCheckMessages = [...aRequiredMessages, ...aRegisterMessages];
				if (aAllCheckMessages.length > 0) {
					return Promise.reject({ aMessages: aAllCheckMessages });
				}

				const aOdataFields = [
					"OUTNO",
					"OUTZ_SHUKKO_JOUKYOU",
					"OUTZ_KIDAI_NO",
					"OUTSORTL",
					"OUTUSR02",
					"OUTMATNR",
					"OUTWERKS",
					"OUTMAKTX",
					"OUTKOUBAI_IRAI_TYPE",
					"OUTBDMNG",
					"OUTMEINS",
					"OUTHIKIATESUYO", // 引当数量 
					"OUTBDTER",
					"OUTZ_TASK_CODE",
					"OUTZ_SHUKKOSAKI",
					"OUTZ_ZUBAN",
					"OUTZ_POSITION_NO",
					"OUTZ_PLNO",
					"OUTZ_OYA_HINBAN",
					"OUTZ_HOJO_HINBAN",
					"OUTZ_SHORI_NO",
					"OUTLGORT",
					"OUTZ_JITSUSHUKKO_NO",
					"Outunchangeflg001",
					"OUTRSNUM",
					"OUTRSPOS",
					"OUTKZMPF",
					"OUTPOSNR", // BOM明細番号 
					"OUTERFMG", // 数量 
					"Outerfme001", // 入力単位 
					"Outrgekz001", // BF 
				];
				const aUpdateList = this._handleFilteringRequiredFields(aUpdate, aOdataFields);
				const aInsertList = this._handleFilteringRequiredFields(aInsert, aOdataFields);
				const aDeleteList = this._handleFilteringRequiredFields(aDelete, aOdataFields);
				if (aDeleteList.length === 0 && aInsertList.length === 0 && aUpdateList.length === 0) {
					const oMessage = {
						type: "Error",
						title: this.oBundle.getText("ErrorTitleNoSelect"),
						description: this.oBundle.getText("noChangeErrorContent"),
						subtitle: this.oBundle.getText("noChangeErrorContent"),
						counter: 1,
					};
					return Promise.reject({ aMessages: [oMessage] });
				} else {
					return Promise.resolve({
						insertList: aInsertList,
						updateList: aUpdateList,
						deleteList: aDeleteList,
					});
				}
			},

			/**
			 * Distiction oData update, oData create by operation
			 */
			_handleDistinctionAddAndUpdate: function (aORowUpdateInsertList) {
				const aUpdate = [];
				const aInsert = [];
				aORowUpdateInsertList.forEach((oRow) => {
					if (oRow.operation === "U") {
						aUpdate.push(oRow);
					} else if (oRow.operation === "I") {
						aInsert.push(oRow);
					}
				});
				return {
					aUpdate,
					aInsert,
				};
			},

			/**
			 * Ignore empty fields
			 */
			_handleFilteringRequiredFields: function (aOData, aOdataFields) {
				return aOData
					.filter((oData) => {
						return aOdataFields.some((sField) => {
							return !!oData[sField];
						});
					})
					.map((oData) => {
						const oNewOdata = {};
						aOdataFields.forEach(
							function (sField) {
								if (sField === "OUTBDTER") {
									oNewOdata[sField] = oData[sField].replace(/[-\/.]/g, "");
								} else if (sField === "Outrgekz001") {
									oNewOdata[sField] = oData[sField] === true ? "X" : "";
								} else {
									oNewOdata[sField] = oData[sField];
								}
							}.bind(this)
						);
						return oNewOdata;
					});
			},

			/**
			 * Updates Odata objects
			 */
			_updateOData: function (aData) {
				return new Promise(
					function (fResolve, fReject) {
						const aMessages = [];
						const oModel = this._getOdataModel();
						const oParameters = {
							success: function () {
								fResolve();
							},
							error: function (oResponse) {
								const aErrorMessages = ErrorHandler.getMessagesResponse(oResponse);
								aErrorMessages.forEach((oErr) => {
									aMessages.push({
										type: "Error",
										title: oErr.title,
										description: oErr.description,
										subtitle: oErr.subtitle,
										counter: 1,
									});
								});

								// Disable register button on Internal Server Error (500) 
								if (aErrorMessages.some((oErr) => oErr.statusCode === "500")) {
									this.byId("RegBtn001").setEnabled(false);
								}

								fReject({ aMessages });
							}.bind(this),
						};

						// start batch processing
						oModel.setDeferredGroups(["group1"]);

						// set mode
						if (aData.deleteList.length) {
							aData.deleteList.forEach(function (oElement) {
								oElement.Outmode001 = "DEL";
							});
						}

						// set mode
						if (aData.insertList.length) {
							aData.insertList.forEach(function (oElement) {
								oElement.Outmode001 = "CRT";
							});
						}

						// set mode
						if (aData.updateList.length) {
							aData.updateList.forEach(function (oElement) {
								oElement.Outmode001 = "UPD";
							});
						}
						const oProperties = {};
						oProperties.Parameter0 = JSON.stringify([
							...aData.insertList,
							...aData.updateList,
							...aData.deleteList,
						]);
						oModel.sDefaultUpdateMethod = "POST";
						oModel.create("/ComponentItemUpdListSet", oProperties, oParameters);

						oModel.submitChanges();
					}.bind(this)
				);
			},

			/**
			 * Output update success messages
			 */
			_outputSuccessMessages: function () {
				MessageBox.show(this.oBundle.getText("updateSuccessContent"), {
					icon: MessageBox.Icon.SUCCESS,
					title: this.oBundle.getText("updateSuccessTitle"),
					description: this.oBundle.getText("updateSuccessContent"),
					subtitle: this.oBundle.getText("updateSuccessTitle"),
					onClose: function (sAction) {
						if (sAction === "OK") {
							this._reFreshOdata();
						}
					}.bind(this),
				});
				return Promise.resolve();
			},

			/**
			 * handle init delete list
			 */
			_initDeleteList: function () {
				this.aDeleteList = [];
				return Promise.resolve();
			},
			
			// *** HANDLE VALIDATION *** //
			/**
			 * Handle validation on a 一覧出力部 cell change — 対象処理フローNo：16
			 */
			onChangeValidateCell: function (oEvent) {
				// Control id matches the row property name
				const sControlId = oEvent.getSource().getId().split("--").pop();
				const oRow = this._getORowData(oEvent);

				this._validateRequiredCell(oRow, sControlId);

				// 既存の OnChange 処理を継続して呼び出す
				const sHandler = Constants.CellChangeHandlers[sControlId];
				if (sHandler && typeof this[sHandler] === "function") {
					this[sHandler](oEvent);
				}

				this.onAutoSelectCheckbox(oEvent);
			},

			/**
			 * Resolve the ［行区分］ of one row
			 * @returns {String} "N" 通常行 / "R" 表示行 / "D" 削除行 / "A" 追加行
			 */
			_getRowKubun: function (oRow) {
				if (oRow.OUTGYOKUBUN) {
					return oRow.OUTGYOKUBUN;
				}
				// ［行区分］未設定の行はオペレーションから判定する
				if (oRow.Outunchangeflg001) {
					return "R";
				}
				if (oRow.operation === "D") {
					return "D";
				}
				return oRow.operation === "I" ? "A" : "N";
			},

			/**
			 * 項目ﾁｪｯｸ基準書 No.53 — 必須入力項目が未入力の場合
			 * ValueState のみ設定する（Popup / Message Popover は なし）
			 */
			_validateRequiredCell: function (oRow, sControlId) {
				const oField = Constants.RequiredCellFields[sControlId];
				if (!oField) {
					return;
				}

				// 必須チェックの対象となる［行区分］のみを処理する
				const sKubun = this._getRowKubun(oRow);
				if (!oField.required.includes(sKubun)) {
					return;
				}

				const sValue = (oRow[sControlId] ?? "").toString().trim();

				Validator._controlValidations(oRow, oField.state, oField.text, [
					{
						fnCheck: () => Validator.isRequired(sValue),
						sMessage: this.oBundle.getText("Error001"),
					},
				]);

				this._getTableModel().refresh();
			},

			// Validation for both Excel import and the Register button (Length, Number, Select, Date, Flag)
			_runRowValidations: async function (aRows, bIsImport = false) {
				const aMessages = [];
				const aSelectedRows = aRows.filter((oItem) => oItem.selected);

				// These fields are only editable on newly inserted/copied
				const fnIsInsertOnlyField = (sField) =>
					Object.values(Constants.InsertOnlyEditableFields).includes(sField);

				// Excel import excludes プラント from Select check; Register uses the full field list with the normal insert-only exemption
				const aSelectCheckFields = bIsImport
					? Constants.SelectCheckFields.filter((oItem) => !oItem.skipOnImport)
					: Constants.SelectCheckFields;

				// 出庫タスク's valid-value list depends on each row's (機台NO, プラント) and is NOT preloaded globally
				// No write to the sharedsearchHelpModel>/SearchHelpTaskCodeSet property here, or it will corrupt the ValueHelp dialog's list for a different row.
				const oTaskCodeListByKey = {};
				const aCombos = [...new Set(aSelectedRows.map((oRow) => `${oRow.OUTZ_KIDAI_NO}|${oRow.OUTWERKS}`))];
				await Promise.all(
					aCombos.map(async (sCombo) => {
						const [sKidaino, sWerks] = sCombo.split("|");
						if (!sKidaino || !sWerks) {
							oTaskCodeListByKey[sCombo] = [];
							return;
						}
						try {
							const oData = await this._readOData(
								[
									new Filter("Zkidaino", FilterOperator.EQ, sKidaino),
									new Filter("Werks", FilterOperator.EQ, sWerks),
								],
								"SearchHelpTaskCodeSet"
							);
							oTaskCodeListByKey[sCombo] = oData.results || [];
						} catch {
							oTaskCodeListByKey[sCombo] = [];
						}
					})
				);

				aSelectedRows.forEach((oRow) => {
					const bIsInsertRow = oRow.operation === "I";

					// --- 4-(1): String length must not exceed each field's max character count ---
					Constants.LengthCheckFieldsImport.forEach((oField) => {
						const sValue = (oRow[oField.field] || "").toString();
						const sLabel = this.oBundle.getText(oField.i18nKey);
						Validator._controlValidations(oRow, oField.state, oField.text, [
							{
								sValue: sValue,
								fnCheck: () => sValue.length <= oField.maxLen,
								sMessage: this.oBundle.getText("ERROR008", [sLabel, oField.maxLen, oRow.index]),
								sStateMessage: this.oBundle.getText("ERROR008VALID", [sLabel, oField.maxLen]),
							},
						]).forEach((sMessage) => aMessages.push(Message.createErrorMessage(sMessage)));
					});

					// --- 4-(2): Numeric value must be valid AND within [0, upper limit] ---.
					Constants.NumberRangeCheckFields.forEach((oField) => {
						const sRaw = (oRow[oField.field] || "").toString().trim().replaceAll(",", "");
						const bIsNumeric = /^-?\d+(\.\d+)?$/.test(sRaw);
						const sLabel = this.oBundle.getText(oField.i18nKey);

						Validator._controlValidations(oRow, oField.state, oField.text, [
							{
								sValue: sRaw,
								fnCheck: () => bIsNumeric,
								sMessage: this.oBundle.getText("ERROR010", [
									Constants.TypeFields.Number,
									oRow.index,
									sLabel,
								]),
								sStateMessage: this.oBundle.getText("ERROR010VALID", [Constants.TypeFields.Number]),
							},
						]).forEach((sMessage) => aMessages.push(Message.createErrorMessage(sMessage)));

						if (bIsNumeric) {
							Validator._controlValidations(oRow, oField.state, oField.text, [
								{
									sValue: sRaw,
									fnCheck: () => parseFloat(sRaw) >= 0 && parseFloat(sRaw) <= oField.maxVal,
									sMessage: this.oBundle.getText("ERROR009", [sLabel, oField.maxVal, oRow.index]),
									sStateMessage: this.oBundle.getText("ERROR009VALID", [sLabel, oField.maxVal]),
								},
							]).forEach((sMessage) => aMessages.push(Message.createErrorMessage(sMessage)));
						}
					});

					// --- 4-(3): Dropdown/search-help value must exist in list ---
					aSelectCheckFields.forEach((oField) => {
						if (fnIsInsertOnlyField(oField.field) && !bIsInsertRow) {
							delete oRow[oField.state];
							delete oRow[oField.text];
							return;
						}
						const sValue = (oRow[oField.field] || "").toString().trim();
						const aList = this._getListByModelName(oField.listKey) || [];
						const sLabel = this.oBundle.getText(oField.i18nKey);
						Validator._controlValidations(oRow, oField.state, oField.text, [
							{
								sValue: sValue,
								fnCheck: () => aList.some((oItem) => oItem[oField.codeProp] === sValue),
								sMessage: this.oBundle.getText("ERROR011", [sLabel, oRow.index]),
								sStateMessage: this.oBundle.getText("ERROR011VALID", [sLabel]),
							},
						]).forEach((sMessage) => aMessages.push(Message.createErrorMessage(sMessage)));
					});

					//  4-(3)-a (出庫タスク): existence check against the per-row task-code list fetched above
					const sTaskCodeValue = (oRow.OUTZ_TASK_CODE || "").toString().trim();

					const aTaskCodeList = oTaskCodeListByKey[`${oRow.OUTZ_KIDAI_NO}|${oRow.OUTWERKS}`] || [];
					const sTaskLabel = this.oBundle.getText("headerGoodsIssueTask");
					if (sTaskCodeValue) {
						Validator._controlValidations(
							oRow,
							"valueStateOutboundTask",
							"valueStateTextOutboundTask",
							[
								{
									fnCheck: () =>
										!sTaskCodeValue ||
										aTaskCodeList.some((oItem) => oItem.Ztaskcode === sTaskCodeValue),
									sMessage: this.oBundle.getText("ERROR011", [sTaskLabel, oRow.index]),
									sStateMessage: this.oBundle.getText("ERROR011VALID", [sTaskLabel]),
								},
							]
						).forEach((sMessage) => aMessages.push(Message.createErrorMessage(sMessage)));
					}

					// --- 4-(4): Date value must be a valid date string ---
					Constants.TableDateFields.forEach((oField) => {
						const sLabel = this.oBundle.getText("headerRequiredDate");
						Validator._controlValidations(oRow, oField.state, oField.text, [
							{
								fnCheck: () => !!oRow[oField.value],
								sMessage: this.oBundle.getText("ERROR001VALID", [oRow.index, sLabel]),
								sStateMessage: this.oBundle.getText("Error001"),
							},
							{
								sValue: oRow[oField.value],
								fnCheck: () => Validator.isDateString(oRow[oField.value]),
								sMessage: this.oBundle.getText("ERROR010", [
									Constants.TypeFields.Date,
									oRow.index,
									sLabel,
								]),
								sStateMessage: this.oBundle.getText("ERROR010VALID", [Constants.TypeFields.Date]),
							},
						]).forEach((sMessage) => aMessages.push(Message.createErrorMessage(sMessage)));
					});

					// --- 4-(5): Flag value must be blank or "X" only ---
					Constants.FlagCheckFields.forEach((oField) => {
						if (typeof oRow[oField.field] !== "string") {
							return;
						}
						const sRaw = oRow[oField.field] == null ? "" : oRow[oField.field].toString().trim();
						// (5)-a: Invalid flag value ("" or "X" only allowed) -> ERROR010
						if (sRaw !== "" && sRaw !== "X") {
							const sLabel = this.oBundle.getText(oField.i18nKey);
							aMessages.push(
								Message.createErrorMessage(
									this.oBundle.getText("ERROR010", ["入力値", oRow.index, sLabel])
								)
							);
						}
					});
				});

				return aMessages;
			},

			/**
			 * Validation for item by row
			 */
			_handleCheckValidateCell: function (oRowData, aFields, bShowError005 = false) {
				let bResult = true;
				const aErrorFields = [];
				const sRequiredMessage = bShowError005
					? this.oBundle.getText("Error005")
					: this.oBundle.getText("Error001");

				aFields.forEach(
					function (sField) {
						const sValue = sField === "OUTKOUBAI_IRAI_TYPE" ? oRowData["OUTKOUBAI_IRAI_TYPEvalue"] || "" : oRowData[sField];
						// Main.view.xml binds valueState<EnglishName>, not valueState<ODataField>
						const sStateKey = Constants.FieldStateKeys[sField] || sField;
						const aFailMessages = Validator._controlValidations(
							oRowData,
							`valueState${sStateKey}`,
							`valueStateText${sStateKey}`,
							[
								{
									fnCheck: () => sValue !== "",
									sMessage: sRequiredMessage,
									sStateMessage: sRequiredMessage,
								},
							]
						);
						if (aFailMessages.length) {
							bResult = false;
							aErrorFields.push(sField);
						}
					}.bind(this)
				);
				this._getTableModel().refresh();
				return { bResult, aErrorFields };
			},

			_checkValidDateField: function (oEvent) {
				const oSource = oEvent.getSource();

				if (!oEvent.getParameter("valid")) {
					oSource.setValueState("Error");
					oSource.setValueStateText(this.oBundle.getText("ErrorDate"));
					return false;
				} else {
					oSource.setValueState("None");
					return true;
				}
			},

			_validateInputs: function (aIdFields) {
				let bValid = true;

				aIdFields.forEach((sId) => {
					const oControl = this.byId(sId);
					if (
						oControl?.getValueState &&
						oControl.getValueState() === sap.ui.core.ValueState.Error &&
						oControl._lastValue
					) {
						bValid = false;
					}
				});
				return bValid;
			},

			// *** HANDLE FORMATTER *** //
			/* Handle Format Edit */
			onFormatEditable: function (flagChange, operation) {
				if (flagChange || operation === "D") {
					return false;
				} else {
					return true;
				}
			},

			/* Handle Show test Edit */
			onShowText: function (flagChange, operation) {
				if (flagChange || operation === "D") {
					return true;
				} else {
					return false;
				}
			},

			// Handle Format Edit for [購買依頼タイプ] 
			onFormatKobairaiTypeEditable: function (flagChange, operation, iQuantity) {
				return !(flagChange || operation === "D" || iQuantity >= 1);
			},

			// Handle Show test Edit for [購買依頼タイプ] 
			onShowKobairaiTypeText: function (flagChange, operation, iQuantity) {
				return flagChange || operation === "D" || iQuantity >= 1;
			},

			/**
			 * handle format display text in 出庫指示状況
			 * @param {String} sCode
			 * @returns {String} sText
			 */
			onFormatTextDeliveryInstructionStatus: function (sCode) {
				if (sCode === "" || sCode === "X") {
					if (sCode === "X") {
						return "済";
					} else {
						return "未";
					}
				}
			},

			/**
			 * handle format display text in 保管場所
			 * @param {String} sCode
			 * @returns {String} sText
			 */
			onFormatTextStorageLocation: function (sOUTLGORT, sOUTWERKS) {
				if (sOUTLGORT) {
					const aStgLocation = this._getListByModelName("StorageLocationModel");
					let sTextFormated = "";
					for (let i = 0; i < aStgLocation.length; i++) {
						if (
							aStgLocation[i].Lgort === sOUTLGORT &&
							aStgLocation[i].Werks === sOUTWERKS
						) {
							sTextFormated = `${aStgLocation[i].Lgort} : ${aStgLocation[i].Name1}`;
						}
					}
					return sTextFormated || sOUTLGORT;
				}
			},

			/**
			 *  Format money on Input value
			 * @param {String} sCurrency
			 * @returns String currency formatted 123,456,789.000
			 */
			currencyInputFormatter: function (sMoney, sCurrency) {
				return Formatter.displayMoneyFormatter(sMoney, sCurrency, true, true);
			},

			// *** HANDLE VIEW SETTING *** //
			/**
			 * Column settings button event handler
			 * Initialize p13nDialog model and its opensResultValue
			 */
			onP13nDialogPress: function () {
				p13nDialogPopup.onP13nDialogPress("zpsr0019", this);
			},

			// *** HANDLE VARIANT MANAGEMENT *** //
			/**
			 * Handle show the button save when resort, and save in the curent variant
			 */
			onDisplaySaveButton: async function () {
				const oView = this.getView();
				variant.onDisplaySaveButton(oView);
				// this._handleAddSelectionInterval();
			},

			/**
			 * Handle bind value variant in the table
			 */
			_handleBindVariantAfterSearch: function () {
				const oView = this.getView();
				variant.handleBindVariantAfterChange(oView);
			},

			// *** HANDLE SLIDER *** //
			/**
			 * Handle on slider value change
			 */
			onSliderChange: function (oEvent) {
				const iVisibleRowCount = oEvent.getParameter("value");
				const oTable = this._getTableControl();
				oTable.setVisibleRowCount(iVisibleRowCount);
			},
		});
	}
);
