sap.ui.define(
	[
		"sap/ui/core/mvc/Controller",
		"sap/base/strings/formatMessage",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"zpsr0122/model/models",
		"sap/ui/core/BusyIndicator",
		"sap/ui/model/json/JSONModel",
		"sap/m/MessageBox",
		"sap/base/util/UriParameters",
		"sap/ui/export/Spreadsheet",
		"../handler/constants/constants",
		"../handler/controlHandler/valueHelpDialog",
		"../handler/controlHandler/p13nDialogPopup",
		"../handler/controlHandler/variant",
		"../handler/controlHandler/excel",
		"../handler/controlHandler/bookmark",
		"../handler/helper/Validator",
		"../handler/helper/Message",
		"../handler/errorHandler/ErrorHandler",
		"../handler/formatter/formatter",
		"../handler/debounce/debounce",
	],
	function (
		Controller,
		formatMessage,
		Filter,
		FilterOperator,
		models,
		BusyIndicator,
		JSONModel,
		MessageBox,
		UriParameters,
		Spreadsheet,
		Constants,
		ValueHelpDialog,
		P13nDialogPopup,
		Variant,
		Excel,
		Bookmark,
		Validator,
		Message,
		ErrorHandler,
		Formatter,
		Debounce
	) {
		"use strict";
		return Controller.extend("zpsr0122.controller.Main", {
			onInit: async function () {
				// Initialize Data Model
				await this._initDataModel();

				// Get all data for pull down and search help
				this._getDataInitialModel();

				// Service variants
				await this._connectPersonalizationService();

				// Book mark
				Bookmark.initialBookmark.apply(this, [`/${Constants.MAIN_PATH}/$count`]);
				// Transfer URL parameter to filter value
				this._handleSetValueParamToFilter();

				// Get Mode from URL and set related view
				this._initExecuteMode();

				// Add event press for DateRangeSelection
				["INZTOKUSHUSHIYOTOROKUBI", "INNTANF"].forEach((sId) => {
					this.byId(sId).addEventDelegate(
						{
							onkeydown: function (oEvent) {
								if (oEvent.key === "Enter") {
									this.onPressSearchButton();
								}
							},
						},
						this
					);
				});
			},

			// Override sap.ui.i18n.ResourceBundle._formatValue prevent log error message
			_formatValue: function (sValue, sKey, aArgs) {
				if (typeof sValue === "string") {
					if (aArgs !== undefined && !Array.isArray(aArgs)) {
						// Log.error("sap/base/i18n/ResourceBundle: value for parameter 'aArgs' is not of type array");
					}

					if (aArgs) {
						sValue = formatMessage(sValue, aArgs);
					}

					if (this.bIncludeInfo) {
						// String object is created on purpose and must not be a string literal
						sValue = new String(sValue);
						sValue.originInfo = {
							source: "Resource Bundle",
							url: this.oUrlInfo.url,
							locale: this.sLocale,
							key: sKey,
						};
					}
				}
				return sValue;
			},
			// Get Mode from URL and set related view
			_initExecuteMode: async function () {
				const aDefaultMode = ["A", "E"];
				const sHash = window.location.hash;
				const sQuery = sHash.split("?")[1] || sHash;
				const sMode = UriParameters.fromQuery(sQuery).get(Constants.EXEC_MODE) || "";
				this.sExec_mode = sMode;

				const oScreenModel = this._getScreenModel();
				if (!sMode || !aDefaultMode.includes(sMode)) {
					window.location.hash = "#Shell-home";
					return window.location.replace();
				}
				const oService = await this.getOwnerComponent().getService("ShellUIService");
				let sDefaultStatus = "";
				if (sMode === "E") {
					oService.setTitle(this.oBundle.getText("TitleModeE"));
					oScreenModel.setProperty("/TitleHeader", this.oBundle.getText("TitleModeE"));
					oScreenModel.setProperty("/TitleButtonRegister", this.oBundle.getText("btnTitleButtonRegisterE"));
					// 検索条件部 項目［状況C］|| 初期値 = "A"(未登録)
					sDefaultStatus = "A";
				} else if (sMode === "A") {
					oService.setTitle(this.oBundle.getText("TitleModeA"));
					oScreenModel.setProperty("/TitleHeader", this.oBundle.getText("TitleModeA"));
					oScreenModel.setProperty("/TitleButtonRegister", this.oBundle.getText("btnTitleButtonRegisterA"));
					// 検索条件部 項目［状況C］|| 初期値 = "B"(登録済)
					sDefaultStatus = "B";
				}

				// Set Init 状況C
				const aStatus = oScreenModel.getProperty("/StatusCode") || [];
				if (!aStatus.length && sDefaultStatus) {
					oScreenModel.setProperty("/StatusCode", [sDefaultStatus]);
				}
			},

			/**
			 *  Initialize Data Model
			 */
			_initDataModel: async function () {
				const oView = this.getView();
				//model for i18n
				this.oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
				// Screen model
				await oView.setModel(models.createMainScreenModel(), "screen");
				// Plant - プラント
				oView.setModel(models.createInitialModel(), "PlantModel");
				// MachineTypeGroup - 機種G
				oView.setModel(models.createInitialModel(), "MachineTypeGroupModel");
				// OrderType - 受注区分
				oView.setModel(models.createInitialModel(), "OrderTypeModel");
				// StatusCode - 状況C
				oView.setModel(models.createStatusCodeModel(), "StatusCodeModel");
				// TechnicalSpecification - 技術特殊仕様
				oView.setModel(models.createTechnicalSpecificationModel(), "TechnicalSpecificationModel");
				// AssemblyStartDate - 組立開始日
				oView.setModel(models.createAssemblyStartDateModel(), "AssemblyStartDateModel");
				// AssemblyAvailableDate - 組立可能日
				oView.setModel(models.createAssemblyAvailableDateModel(), "AssemblyAvailableDateModel");
			},

			/**
			 * Handle get all data for pull down and search help
			 */
			_getDataInitialModel: function () {
				// API: Plant[プラント]
				this._readOData([], "F4PlantSet")
					.then((oDataModel) => {
						this._setModelByName(oDataModel, "PlantModel");
					})
					.catch(() => {
						this._setModelByName({ results: [] }, "PlantModel");
					});

				// API: MachineTypeGroup[機種G]
				this._readOData([], "F4ModelGSet")
					.then((oDataModel) => {
						this._setModelByName(oDataModel, "MachineTypeGroupModel");
					})
					.catch(() => {
						this._setModelByName({ results: [] }, "MachineTypeGroupModel");
					});

				// API: OrderType[受注区分]
				this._readOData([], "F4OrderCateSet")
					.then((oDataModel) => {
						this._setModelByName(oDataModel, "OrderTypeModel");
					})
					.catch(() => {
						this._setModelByName({ results: [] }, "OrderTypeModel");
					});
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

			// Getter

			/**
			 * Get OData model
			 */
			_getOdataModel: function () {
				return this.getOwnerComponent().getModel();
			},

			/* Sub odata */
			_getSubOdataModel: function () {
				return this.getOwnerComponent().getModel("subModel");
			},

			/**
			 * Get view model by model name
			 * @param {String} sModelName
			 * @returns {sap.ui.model.Model}
			 */
			_getModelByName: function (sModelName) {
				return this.getView().getModel(sModelName);
			},

			/**
			 * Get view model by model name
			 * @returns {sap.ui.model.Model}
			 */
			_getTableModel: function () {
				return this.getView().getModel(Constants.MAIN_TABLE_MODEL_NAME);
			},

			/**
			 * Get screen model
			 */
			_getScreenModel: function () {
				return this.getView().getModel("screen");
			},

			/**
			 * Get Table Controls
			 * @returns Table Control
			 */
			_getTableControl: function () {
				return this.getView().byId("tblMain");
			},

			/**
			 * @param {String} sControlId
			 * @returns sapui5 Control
			 */
			_getControlById: function (sControlId) {
				return this.getView().byId(sControlId);
			},

			/**
			 * Get event row context
			 * @returns {Object} Row Context
			 */
			_getTableRowContext: function (oInputControl) {
				return oInputControl.getBindingContext(Constants.MAIN_TABLE_MODEL_NAME).getObject();
			},

			/**
			 * Get context odata table model
			 * @param {sap.ui.table.Table} oTable
			 * @returns {Object}
			 */
			_getTableContextData: function (oTable) {
				const aData = [];
				const oBinding = oTable.getBinding("rows");
				if (!oBinding) {
					return aData;
				}
				const aTableContext = oTable.getBinding("rows").getAllCurrentContexts();
				aTableContext.forEach((oContext) => {
					aData.push(oContext.getObject());
				});
				return aData;
			},

			/**
			 * Get screen all filter bar
			 */
			_getFilterBars: function () {
				const oDynamicPageHeaderControl = this.byId("_MainDynamicPageHeader");
				const aContent = oDynamicPageHeaderControl.getContent();
				return aContent.filter((oContent) => oContent instanceof sap.ui.comp.filterbar.FilterBar);
			},

			/**
			 * Get all filter bar items
			 * @param {string} sFilterBarId
			 * @returns
			 */
			_getAllFilterBarItems: function (sFilterBarId) {
				const oFilterBarControl = this.byId(sFilterBarId);
				return oFilterBarControl.getFilterGroupItems();
			},

			// Setter

			/**
			 * Set odata convert to json model to view
			 * @param {Object} oDataModel
			 * @param {String} sModelName
			 */
			_setModelByName: function (oDataModel, sModelName) {
				this.getView().setModel(new JSONModel(oDataModel.results), sModelName);
			},

			/**
			 * Set OData table
			 * @param {Object[]}
			 */
			_setODataTable: function (oData) {
				this._getScreenModel().setProperty("/RowCount", oData.length);
				this.getView().setModel(new JSONModel(oData), Constants.MAIN_TABLE_MODEL_NAME);
			},

			// Event Handler

			/**
			 * Event handling when Search button pressed
			 */
			onPressSearchButton: Debounce(function () {
				//get filters from ScreenModel
				this._getFilters()
					// Clear all messages before search to avoid confusion with past messages - No.2204
					.then(this._removeAllMessages.bind(this))
					//retrieve data
					.then(this._readOData.bind(this))
					//set retrieved data to ScreenModel
					.then(this._setResult.bind(this))
					// handle bind variant after search
					.then(this._handleBindVariantAfterSearch.bind(this))
					// Re-index
					.then(this._adjustTableContent.bind(this))
					//clear all messages
					.then(this._clearMessages.bind(this))
					//when error occurs above, output messages
					.catch(this._resetMessages.bind(this));
			}, 0),

			/**
			 * Clear all messages and pass through data for chaining - No.2204
			 */
			_removeAllMessages: function (aFilters) {
				sap.ui.getCore().getMessageManager().removeAllMessages();
				return aFilters;
			},

			/**
			 * Get filters from ScreenModel
			 */
			_getFilters: function () {
				const aMessages = [];
				const aFilters = [];
				const oFilter = this._getScreenModel().getData();
				const oPlantControl = this._getControlById("INWERKS"); //プラント
				const oAssemblyMonthControl = this._getControlById("INNTANF"); // 組立月
				const oTechnicalSpecificationRegistrationDate = this._getControlById("INZTOKUSHUSHIYOTOROKUBI"); // 技術特殊仕様登録日

				/**
				 * FilterBar Plant プラント
				 * Check Required 3-1.項目ﾁｪｯｸ基準書
				 */
				if (oFilter.Plant.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.Plant, "inwerks"));
				} else {
					aMessages.push(Message.createErrorMessage(this.oBundle.getText("Error017")));
				}

				// FilterBar MachineNo 機台NO
				if (oFilter.MachineNo.length) {
					aFilters.push(new Filter("inz_kidai_no", FilterOperator.Contains, oFilter.MachineNo));
				}

				// FilterBar MachineTypeGroup 機種G
				if (oFilter.MachineTypeGroup.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.MachineTypeGroup, "inarbpl"));
				}

				// FilterBar OrderType 受注区分
				if (oFilter.OrderType.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.OrderType, "inzjuchu_kb"));
				}

				// FilterBar StatusCode 状況C
				if (oFilter.StatusCode.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.StatusCode, "intxt04"));
				}

				// FilterBar TechnicalSpecification 技術特殊仕様
				if (oFilter.TechnicalSpecification.length) {
					aFilters.push(
						this._getFiltersFromTokenModel(oFilter.TechnicalSpecification, "inztokushushiyoumuflg")
					);
				}

				// FilterBar TechnicalSpecificationRegistrationDate 技術特殊仕様登録日
				if (oFilter.TechnicalSpecificationRegistrationDate) {
					aFilters.push(
						this._getFiltersFromDateRangeSelection(
							oFilter.TechnicalSpecificationRegistrationDate,
							"inztokushushiyotorokubi"
						)
					);
				}

				// FilterBar AssemblyStartDate 組立開始日
				if (oFilter.AssemblyStartDate) {
					aFilters.push(new Filter("inasm_start_reg", FilterOperator.EQ, oFilter.AssemblyStartDate));
				}

				// FilterBar AssemblyAvailableDate 組立可能日
				if (oFilter.AssemblyAvailableDate) {
					aFilters.push(new Filter("inasm_ready_reg", FilterOperator.EQ, oFilter.AssemblyAvailableDate));
				}

				// FilterBar AssemblyMonth 組立月
				if (oFilter.AssemblyMonth) {
					const oAssemblyMonth = new Date(oFilter.AssemblyMonth);
					aFilters.push(
						new Filter("inntanf", FilterOperator.EQ, Formatter.dateInputFormatter(oAssemblyMonth, "yyyyMM"))
					);
				}

				// Execution mode
				aFilters.push(new Filter("exec_mode", FilterOperator.EQ, this.sExec_mode));

				// Toggle value state
				Validator._controlValidations(oPlantControl, "", [
					{
						fnCheck: () => oFilter.Plant.length,
						sMessage: this.oBundle.getText("Error017"),
					},
				]);

				// Date format validation: Assembly Month - 組立月
				const aAssemblyResults = Validator._controlValidations(oAssemblyMonthControl, "", [
					{
						fnCheck: () => !oFilter.AssemblyMonth || Validator.isDateString(oFilter.AssemblyMonth),
						sMessage: this.oBundle.getText("Error018"),
					},
				]);
				if (aAssemblyResults.length) {
					aMessages.push(Message.createErrorMessage(aAssemblyResults[0]));
				}

				// Date format validation: 技術特殊仕様登録日
				const aTechnicalSpecificationRegistrationDate = Validator._controlValidations(
					oTechnicalSpecificationRegistrationDate,
					"",
					[
						{
							fnCheck: () =>
								!oFilter.TechnicalSpecificationRegistrationDate ||
								Validator.isDateString(oFilter.TechnicalSpecificationRegistrationDate),
							sMessage: this.oBundle.getText("Error018"),
						},
					]
				);
				if (aTechnicalSpecificationRegistrationDate.length) {
					aMessages.push(Message.createErrorMessage(aTechnicalSpecificationRegistrationDate[0]));
				}

				if (aMessages.length) {
					return Promise.reject(aMessages);
				} else {
					return Promise.resolve(aFilters);
				}
			},

			/**
			 * Get filter values from model
			 * @param {Object} aTokenModel
			 * @param {String} sKey
			 * @returns
			 */
			_getFiltersFromTokenModel: function (aTokenModel, sKey) {
				const oExcludeOperation = {
					EQ: "NE",
					Contains: "NotContains",
					EndsWith: "NotEndsWith",
					StartsWith: "NotStartsWith",
					BT: "NB",
					GE: "LT",
					GT: "LE",
					LE: "GT",
					LT: "GE",
				};

				const aFilters = aTokenModel.map((oTokenModel) => {
					const oRange = oTokenModel.range;
					if (oRange) {
						const sOperation = oRange.exclude ? oExcludeOperation[oRange.operation] : oRange.operation;
						return new Filter(sKey, sOperation, oRange.value1, oRange.value2);
					} else {
						return new Filter(sKey, FilterOperator.EQ, oTokenModel.key || oTokenModel);
					}
				});
				return new Filter({
					filters: aFilters,
					and: false,
				});
			},

			/**
			 * Get filter values from model
			 * @param {Object} aTokenModel
			 * @param {String} sKey
			 * @returns
			 */
			_getFiltersFromDateRangeSelection: function (sDateValue, sKey) {
				const aSplitDate = sDateValue.split(" - ");
				const sFirstDate = aSplitDate[0]?.replaceAll("/", "");
				const sSecondDate = aSplitDate[1]?.replaceAll("/", "") || null;
				if (!sSecondDate) {
					return new Filter(sKey, FilterOperator.EQ, sFirstDate);
				} else {
					return new Filter(sKey, FilterOperator.BT, sFirstDate, sSecondDate);
				}
			},

			/**
			 * OData model read data
			 */
			_readOData: function (aFilters, sPath = Constants.MAIN_PATH, bIsSubModel = false) {
				if (sPath === Constants.MAIN_PATH) {
					BusyIndicator.show(0);
					// Reset register button after the main table reloads - No.2204
					this.byId("SaveButton").setEnabled(true);
				}
				return new Promise(
					function (fResolve, fReject) {
						const oModel = bIsSubModel ? this._getSubOdataModel() : this._getOdataModel();
						oModel.read(`/${sPath}`, {
							filters: aFilters,
							success: function (oData) {
								BusyIndicator.hide();
								fResolve(oData);
							}.bind(this),
							error: function (oResponse) {
								BusyIndicator.hide();
								const aMessages = ErrorHandler.getMessagesResponse(oResponse);
								if (sPath === Constants.MAIN_PATH) {
									this._setODataTable([]);
								}
								fReject(aMessages);
							}.bind(this),
						});
					}.bind(this)
				);
			},

			/**
			 * Set retrieved data to view
			 */
			_setResult: function (oData) {
				/**
				 * Check exist data
				 * 1-4 対象データが存在しない場合
				 */
				if (oData.results.length === 0) {
					this._setODataTable([]);
					return Promise.reject([Message.createErrorMessage(this.oBundle.getText("Error014"))]);
				}

				//判定条件 と 設定値
				const aResults = oData.results.map((item) => {
					const sStatus = item.outtxt04; // 組立可能日確認状況
					let sFlag = "";

					// ① Mode = 'E' && status ≠ '未登録'
					if (this.sExec_mode === "E" && sStatus !== "未登録") {
						sFlag = "X";
					}
					// ② Mode = 'A' && status ≠ '登録済'
					else if (this.sExec_mode === "A" && sStatus !== "登録済") {
						sFlag = "X";
					}
					// ③ other → active
					else {
						sFlag = "";
					}
					item.outuser_status_flg = sFlag;
					return item;
				});

				this._handleInitODataTable(aResults);
				this._initialSortProperties(aResults);
				this._setODataTable(aResults);
				return Promise.resolve();
			},

			/**
			 * Adjust Table Content
			 * Re-arange index
			 * Select all checkbox
			 * Visible columns エラーメッセージ
			 */
			_adjustTableContent: function () {
				const oTable = this._getTableControl();
				const oErrorMessageColumn = this._getControlById("_IDGenColumn22");
				let bExistErrorMessage = false;

				const aTableContext = this._getTableContextData(oTable);
				aTableContext.forEach((oItem, index) => {
					oItem.index = index + 1;
					if (oItem.outerror_message) {
						bExistErrorMessage = true;
					}
				});
				// Display column エラーメッセージ if exist value
				oErrorMessageColumn?.setVisible(bExistErrorMessage);
				this._setODataTable(aTableContext);
				return Promise.resolve();
			},

			/**
			 * Handle bind value variant in the table
			 */
			_handleBindVariantAfterSearch: function () {
				const oView = this.getView();
				Variant.handleBindVariantAfterChange(oView);
			},

			/**
			 * Handle init data of table
			 * @param {Object[]} aDataTable
			 */
			_handleInitODataTable: function (aDataTable) {
				aDataTable.forEach((oItem) => {
					Constants.TABLE_DATE_PROPERTIES.forEach((sDate) => {
						oItem[sDate] = Formatter.onFormatDisplayDate(oItem[sDate]);
					});

					Constants.TABLE_NUMBER_PROPERTIES.forEach((sNumberItem) => {
						oItem[sNumberItem] = Formatter.displayMoneyFormatter(
							oItem[sNumberItem]?.toString() || "",
							"JPY",
							true,
							false
						);
					});

					// Determine active item 組立可能日
					oItem.bIsActiveAssemblyAvailableDate = oItem.outuser_status_flg !== "X";

					// Reset "Check All" state
					this._getScreenModel().setProperty("/bCheckAll", false);
				});
			},

			/* Handle on toggle checkAll */
			onCheckAllToggle: function (oEvent) {
				const oTable = this._getTableControl();
				const oTableContext = this._getTableContextData(oTable);
				const bIsSelected = oEvent.getParameter("selected");
				oTableContext.forEach((oContextItem) => {
					if (bIsSelected && !oContextItem.bIsActiveAssemblyAvailableDate) {
						oContextItem.bSelected = false;
						return;
					}
					oContextItem.bSelected = bIsSelected;
				});
				this._getTableModel().refresh();
			},

			/* Handle toggle checkbox on check */
			onCheckBoxSelected: function () {
				const oTable = this._getTableControl();
				const aContextTable = this._getTableContextData(oTable);
				const oScreenModel = this._getScreenModel();

				if (!aContextTable.length) {
					return oScreenModel.setProperty("/bCheckAll", false);
				}

				const aActicveRows = aContextTable.filter((oItem) => oItem.bIsActiveAssemblyAvailableDate);
				const bSelectAll = aActicveRows.length > 0 && aActicveRows.every((oItem) => oItem.bSelected);

				oScreenModel.setProperty("/bCheckAll", bSelectAll);
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
				const aSortField = [Constants.TABLE_NUMBER_PROPERTIES];
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
			 * Output ScreenModel messages
			 */
			_resetMessages: function (aMessages) {
				const oScreenModel = this._getScreenModel();
				const oMessageType = {
					Error: "Error",
					Success: "Success",
					Information: "Information",
					Warning: "Warning",
				};

				const oButtonType = {
					Error: "Negative",
					Success: "Success",
					Information: "Emphasized",
					Warning: "Attention",
				};

				const oButtonIcon = {
					Error: "sap-icon://message-error",
					Success: "sap-icon://message-success",
					Information: "sap-icon://message-information",
					Warning: "sap-icon://message-warning",
				};

				const fnSetButtonByType = function (sType) {
					oScreenModel.setProperty("/MessageButtonType", oButtonType[sType]);
					oScreenModel.setProperty("/MessageButtonIcon", oButtonIcon[sType]);
				};

				// Syntax exception
				if (aMessages instanceof Error) {
					throw new Error(aMessages);
				}

				// Array validation
				if (!Array.isArray(aMessages)) {
					return;
				}

				const bIsExistSuccess = aMessages.some((oMessage) => oMessage.type === oMessageType.Success);
				const bIsExistError = aMessages.some((oMessage) => oMessage.type === oMessageType.Error);
				const bIsExistWarning = aMessages.some((oMessage) => oMessage.type === oMessageType.Warning);
				const bIsExistInfo = aMessages.some((oMessage) => oMessage.type === oMessageType.Information);

				if (bIsExistInfo) {
					fnSetButtonByType(oMessageType.Information);
				}

				if (bIsExistWarning) {
					fnSetButtonByType(oMessageType.Warning);
				}

				if (bIsExistError) {
					fnSetButtonByType(oMessageType.Error);
				}

				if (bIsExistSuccess) {
					fnSetButtonByType(oMessageType.Success);
				}

				const iMessageLength = aMessages.length;
				oScreenModel.setProperty("/Messages", aMessages);
				oScreenModel.setProperty("/MessageCount", iMessageLength);
				oScreenModel.setProperty("/HaveMessage", !!iMessageLength);

				// Show Info popup
				if (bIsExistInfo) {
					return;
				}

				// Show success popup
				if (bIsExistSuccess) {
					return MessageBox.show(this.oBundle.getText("SuccessPopup"), {
						icon: MessageBox.Icon.SUCCESS,
						title: this.oBundle.getText("SuccessTitle"),
					});
				}
				// Show error popup
				if (bIsExistError) {
					return MessageBox.show(this.oBundle.getText("ErrorPopup"), {
						icon: MessageBox.Icon.ERROR,
						title: this.oBundle.getText("ErrorTitle"),
					});
				}
			},

			/**
			 * Event handling when message button pressed
			 */
			onPressMessageButton: function (oEvent) {
				const oMessagePopover = this.getView().byId("messageArea");
				oMessagePopover.toggle(oEvent.getSource());
			},

			/**
			 * Clear selection on Table
			 */
			_clearSelection: function () {
				const oTable = this._getTableControl();
				oTable.clearSelection();
			},

			/**
			 * Clear ScreenModel messages
			 */
			_clearMessages: function () {
				this._clearSelection();
				return this._resetMessages([]);
			},

			/**
			 * Handle on slider value change
			 */
			onSliderChange: function (oEvent) {
				const iVisibleRowCount = oEvent.getParameter("value");
				const oTable = this._getTableControl();
				oTable.setVisibleRowCount(iVisibleRowCount);
			},

			/**
			 * Event handling when Clear button pressed
			 */
			onPressClearButton: function () {
				const oScreenModel = this._getScreenModel();
				oScreenModel.setProperty("/Plant", []); //プラント
				oScreenModel.setProperty("/MachineNo", ""); //機種G
				oScreenModel.setProperty("/MachineTypeGroup", []);
				oScreenModel.setProperty("/OrderType", []); //受注区分
				oScreenModel.setProperty("/StatusCode", []); //状況C
				oScreenModel.setProperty("/TechnicalSpecification", []); //技術特殊仕様登録日
				oScreenModel.setProperty("/TechnicalSpecificationRegistrationDate", "");
				oScreenModel.setProperty("/AssemblyStartDate", ""); //組立可能日
				oScreenModel.setProperty("/AssemblyAvailableDate", ""); //組立可能日
				oScreenModel.setProperty("/AssemblyMonth", ""); //組立月
				this._getControlById("INWERKS").setValueState("None"); //プラント
				this._getControlById("INZTOKUSHUSHIYOTOROKUBI").setValueState("None"); //技術特殊仕様登録日
				this._getControlById("INNTANF").setValueState("None"); //組立月
				this._resetMessages([]);
			},

			/**
			 * Handle Open Multi Value Help Request
			 * @param {*} oEvent
			 */
			onMultipleConditionsVHRequested: function (oEvent) {
				const oControl = oEvent.getSource();
				const sName = oControl.getName();
				// Init property for dialog
				let oColumns = {};
				const sTitle = this.oBundle.getText(`filter${sName}`);

				// MachineTypeGroup - 機種G
				if (sName === "MachineTypeGroup") {
					oColumns = {
						Plant: "werks",
						WorkCenter: "arbpl",
						ShortText: "ktext",
					};
				}

				// Init property for dialog
				const aFilters = this._getValueHelpFilterByName(sName);
				ValueHelpDialog.onMultiValueHelpRequest.apply(this, [
					Constants.PROGRAM_ID,
					oControl,
					sTitle,
					oColumns,
					aFilters,
					[],
					["MachineTypeGroup"],
				]);
			},

			/**
			 * Obtain filters for value help and suggestion
			 */
			_getValueHelpFilterByName: function (sName) {
				const aFilters = [];
				const oScreenModel = this._getScreenModel();

				// MachineTypeGroup - 機種G
				if (sName === "MachineTypeGroup") {
					const aPlant = oScreenModel.getProperty("/Plant");
					if (aPlant.length) {
						const oPlant = this._getFiltersFromTokenModel(aPlant, "werks");
						aFilters.push(oPlant);
					}
				}
				return aFilters;
			},

			/**
			 * Convert value input to token
			 */
			onTokenUpdate: function (oEvent) {
				const oScreenModel = this._getScreenModel();
				const oSource = oEvent.getSource();
				const sName = oSource.getName();
				setTimeout(() => {
					const aTotalToken = oSource.getTokens();
					const aScreenToken = aTotalToken.map((oToken) => {
						const sKey = oToken.getKey() || oToken.getText();
						const oRangeData = oToken.data();
						const oTokens = {
							key: sKey,
							text: oToken.getText(),
						};
						if (oRangeData) {
							oTokens.range = oRangeData.range;
						}
						return oTokens;
					});
					oScreenModel.setProperty(`/${sName}`, aScreenToken);
					oScreenModel.refresh();
				}, 0);
			},

			/**
			 * Read change value and convert token value
			 */
			onTokenChange: function (oEvent) {
				const oSource = oEvent.getSource();
				const sName = oSource.getName();
				const sInputValue = oSource.getValue();
				const oScreenModel = this._getScreenModel();
				const aStoreModel = oScreenModel.getProperty(`/${sName}`);
				oSource.setValue("");
				setTimeout(() => {
					aStoreModel.push({ key: sInputValue, text: sInputValue });
					oScreenModel.refresh();
				});
			},

			/**
			 * Handle logic suggestion
			 */
			onSuggest(oEvent, sText) {
				const sTerm = (oEvent.getParameter("suggestValue") || "").trim();
				if (!sTerm || sText !== "arbpl") return;
				const aPlant = this._getScreenModel().getData().Plant || [];
				const aFilters = [];

				if (aPlant.length) {
					aFilters.push(
						new Filter({
							filters: aPlant.map((sPlan) => new Filter("werks", FilterOperator.EQ, sPlan)),
							and: false,
						})
					);
				}
				aFilters.push(
					new Filter({
						filters: [
							new Filter("arbpl", FilterOperator.StartsWith, sTerm),
							new Filter("ktext", FilterOperator.StartsWith, sTerm),
						],
						and: false,
					})
				);
				oEvent
					.getSource()
					.getBinding("suggestionItems")
					.filter(new Filter({ filters: aFilters, and: true }));
			},

			/**
			 * Toggle display reflection component
			 * ［一括入力の表示］
			 * 		一括入力フォームを表示する。
			 * 		ボタン表示名を ［一括入力の非表示］ に変更する。
			 * ［一括入力の非表示］
			 * 		一括入力フォームを閉じる（非表示）。
			 * 		ボタン表示名を ［一括入力の表示］ に変更する。
			 *
			 * @param {sap.ui.base.Event} oEvent
			 */
			onToggleReflectingButton: function (oEvent) {
				const oButton = oEvent.getSource();
				const sButtonText = oButton.getText();
				const sDisplayText = this.oBundle.getText("btnDisplayOfBatchInput");
				const sHiddenText = this.oBundle.getText("btnHiddenOfBatchInput");
				const oReflectComponent = this.byId("reflect_component");
				if (sButtonText === sDisplayText) {
					oButton.setText(sHiddenText);
					oReflectComponent.addStyleClass("d-flex");
					oReflectComponent.removeStyleClass("d-none");
				} else {
					oButton.setText(sDisplayText);
					oReflectComponent.addStyleClass("d-none");
					oReflectComponent.removeStyleClass("d-flex");
				}
			},

			/**
			 * Handle selected check box when value change
			 */
			onAutoCheckBox: function (oEvent) {
				const oRow = oEvent.getSource().getBindingContext("oDataTable").getObject();
				oRow["bSelected"] = true;
			},

			/**
			 * Handle validation  組立月 - AssemblyMonth
			 */
			onChangeAssemblyMonth: function (oEvent) {
				const oAssemblyDateControl = oEvent.getSource();
				const sValue = oAssemblyDateControl.getValue();

				Validator._controlValidations(oAssemblyDateControl, "", [
					{
						fnCheck: () => !sValue || Validator.isDateString(sValue),
						sMessage: this.oBundle.getText("Error018"),
					},
				]);
			},

			/**
			 * Handle validation  技術特殊仕様登録日
			 */
			onChangeRegistrationDate: function (oEvent) {
				const oTechnicalSpecificationRegistrationDate = oEvent.getSource();
				const sValue = oTechnicalSpecificationRegistrationDate.getValue();

				Validator._controlValidations(oTechnicalSpecificationRegistrationDate, "", [
					{
						fnCheck: () => !sValue || Validator.isDateString(sValue),
						sMessage: this.oBundle.getText("Error018"),
					},
				]);
			},

			/**
			 * Handle validation Date
			 */
			onDateChangeAssemblyDate: function (oEvent, sText) {
				const oAssemblyDate = oEvent.getSource();
				const sValue = oAssemblyDate.getValue();

				if (sText === "outusr09") {
					Validator._controlValidations(oAssemblyDate, "", [
						{
							// Required check
							fnCheck: () => Validator.isRequired(sValue),
							sMessage: this.oBundle.getText("Error017"),
						},
						{
							// Date string check
							fnCheck: () => Validator.isDateString(sValue),
							sMessage: this.oBundle.getText("Error018"),
						},
					]);
				}

				if (sText === "AssemblyDateReflection") {
					Validator._controlValidations(oAssemblyDate, "", [
						{
							// Date string check
							fnCheck: () => !sValue || Validator.isDateString(sValue),
							sMessage: this.oBundle.getText("Error018"),
						},
					]);
				}
				this._getTableModel().refresh();
			},

			/**
			 * Handle press reflection button
			 */
			onPressReflectionButton: function () {
				const aMessages = [];
				const oTable = this._getTableControl();
				const oScreenModel = this._getScreenModel();
				const aTableContext = this._getTableContextData(oTable);

				const sAssemblyDateReflectionReflection = oScreenModel.getProperty("/AssemblyDateReflection");
				const oAssemblyDateReflectionControl = this._getControlById("BULKZACTDELDATE");
				const aSelectedRows = aTableContext.filter((oItem) => oItem.bSelected);

				// 一覧上の対象行選択チェックボックスがすべて OFF の状態でボタンを押下した場合
				if (!aSelectedRows.length) {
					aMessages.push(Message.createErrorMessage(this.oBundle.getText("Error015")));
					return this._resetMessages(aMessages);
				}

				// Validation エラーが発生している場合 ※ メッセージ通知は行わず、処理を中断する
				const aResult = Validator._controlValidations(oAssemblyDateReflectionControl, "", [
					{
						fnCheck: () =>
							!sAssemblyDateReflectionReflection ||
							Validator.isDateString(sAssemblyDateReflectionReflection),
						sMessage: this.oBundle.getText("Error018"),
					},
				]);

				if (aResult.length) {
					return;
				}
				aSelectedRows.forEach((oItem) => {
					oItem.outusr09 = sAssemblyDateReflectionReflection;
					Validator._controlValidations(oItem, "outusr09", [
						{
							// Required check
							fnCheck: () => Validator.isRequired(oItem.outusr09),
							sMessage: this.oBundle.getText("Error017"),
						},
					]);
				});
				this._resetMessages([]);
				this._getTableModel().refresh();
			},

			/**
			 * handle on press download standard button
			 */
			onPressDownloadButton: function () {
				const oTable = this._getTableControl();
				const aDataSource = this._getTableContextData(oTable);
				const oSpecialItems = {
					aNumberItems: Constants.TABLE_NUMBER_LABELS,
					aAmountItems: Constants.TABLE_AMOUNT_LABELS,
					aDateItems: Constants.TABLE_DATE_LABELS,
				};
				const aCols = Excel.createColumnConfig(oTable, oSpecialItems);
				const oFormatItems = {
					aNumberItems: Constants.TABLE_NUMBER_PROPERTIES,
					aAmountItems: Constants.TABLE_AMOUNT_PROPERTIES,
					aDateItems: Constants.TABLE_DATE_PROPERTIES,
				};
				Excel.handleDownloadExcel(aDataSource, aCols, oFormatItems, Constants.PROGRAM_ID);
			},

			/**
			 * Handle press export format button
			 */
			onPressExportFormatButton: function () {
				const aColumnLabels = ["No", "機台NO", "組立開始日"];
				const oConfig = aColumnLabels.map((sColumnLabel) => {
					return {
						label: sColumnLabel,
						property: "",
						type: "string",
						width: sColumnLabel.length * 3,
					};
				});
				const oSettings = {
					workbook: {
						columns: oConfig,
						hierarchyLevel: "Level",
					},
					dataSource: [""],
					fileName: `ZPSR0122_Format_Import`,
					worker: true,
				};

				const oSheet = new Spreadsheet(oSettings);
				oSheet
					.build()
					.then(function () {})
					.finally(function () {
						oSheet.destroy();
					});
			},

			/**
			 * Handle on import file button EXCEL取込
			 */
			onPressImportExcelButton: function () {
				const oImportControl = this.getView().byId("ExcelBtn");
				const oDomRef = oImportControl.FUEl;
				const oInputFile = oDomRef.files[0];
				const aAceptFileType = [
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					"application/vnd.ms-excel",
				];
				// 入力ファイル形式（拡張子）が .xlsx 形式でない場合
				if (oInputFile) {
					if (aAceptFileType.includes(oInputFile.type)) {
						this._handleUploadFile(oInputFile);
					} else {
						const aMessages = [Message.createErrorMessage(this.oBundle.getText("Error013"))];
						return this._resetMessages(aMessages);
					}
				}
			},

			/**
			 * Handle show message on type miss match
			 * 入力ファイル形式（拡張子）が .xlsx 形式でない場合
			 */
			onTypeMissMatch: function () {
				const aMessages = [Message.createErrorMessage(this.oBundle.getText("Error013"))];
				return this._resetMessages(aMessages);
			},

			/**
			 * Remove white space from keys
			 * @returns
			 */
			_removeWhitespaceFromKeys: function (aInputData) {
				return aInputData.map((oInputDataItem) => {
					const oNewObject = {};
					for (const sKey in oInputDataItem) {
						if (Object.prototype.hasOwnProperty.call(oInputDataItem, sKey)) {
							const sNewKey = sKey.trim();
							oNewObject[sNewKey] = oInputDataItem[sKey];
						}
					}
					return oNewObject;
				});
			},

			/**
			 * Extract data from input file
			 * @param {File} oInputFile
			 */
			_handleUploadFile: function (oInputFile) {
				const aFilters = [];
				const oFileReader = new FileReader();
				const oTable = this._getTableControl();

				oFileReader.onload = function (e) {
					const aResultData = [];
					const arrayBuffer = e.target.result;
					const workbook = XLSX.read(arrayBuffer, {
						type: "array",
						raw: false,
						dateNF: "yyyy/MM/dd",
					});
					let aExcelData;

					// Read excel sheet
					workbook.SheetNames.forEach(function (sheetName) {
						aExcelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName], { raw: false });
					});

					aExcelData = this._removeWhitespaceFromKeys(aExcelData);
					const oRegisterKeys = {
						No: "No",
						組立開始日: "AssemblyDateReflection",
						機台NO: "MachineNo",
					};

					// Read data from file
					Array.isArray(aExcelData) &&
						aExcelData.forEach((oExcelItem, index) => {
							const aInputKeys = Object.keys(oRegisterKeys);
							const aDateItems = ["組立開始日"];
							const oLineItem = aInputKeys.reduce((oOriginValue, sKey) => {
								const oReturn = {
									...oOriginValue,
									[oRegisterKeys[sKey]]: oExcelItem[sKey] || "",
								};
								// Re-format date items
								if (aDateItems.includes(sKey)) {
									oReturn[oRegisterKeys[sKey]] = oExcelItem[sKey]?.replace(/[/-]/g, "") || "";
								}
								return oReturn;
							}, {});
							oLineItem.index = index + 1;
							aResultData.push(oLineItem);
						});

					/**
					 * 1.	入力ファイル形式（拡張子）が .xlsx 形式でない場合
					 * 2.	有効レコードが 0 件（2行目のデータが空白）の場合
					 * 3.	取込フォーマットファイル内の項目［機台NO］の値が空白の場合
					 */
					const bEmptyMachineNo = aResultData.some((oItem) => !oItem.MachineNo);
					if (!aResultData.length || bEmptyMachineNo) {
						const aMessages = [Message.createErrorMessage(this.oBundle.getText("Error013"))];
						return this._resetMessages(aMessages);
					}

					const aMachineFilters = aResultData.map(
						(oItem) => new Filter("inz_kidai_no", FilterOperator.EQ, oItem.MachineNo)
					);
					aFilters.push(
						new Filter({
							filters: aMachineFilters,
							and: false,
						})
					);
					BusyIndicator.show(0);
					this._readOData(aFilters, Constants.MAIN_PATH)
						.then((oData) => {
							const aResponseData = oData.results || [];
							const aSortedData = [];
							const aMatchesMachineNo = [];

							if (!aResponseData.length) {
								const aMessages = [Message.createErrorMessage(this.oBundle.getText("Error014"))];
								return this._resetMessages(aMessages);
							}
							// Sort by MachineNo
							aResultData.forEach((oItem) => {
								if (!aMatchesMachineNo.includes(oItem.MachineNo)) {
									aResponseData.forEach((oResponse) => {
										if (oResponse.outz_kidai_no === oItem.MachineNo) {
											oResponse.outusr09 = oItem.AssemblyDateReflection;
											Validator._controlValidations(oResponse, "outusr09", [
												{
													// Required check
													fnCheck: () => Validator.isRequired(oResponse.outusr09),
													sMessage: this.oBundle.getText("Error017"),
												},
												{
													// Date string check
													fnCheck: () => Validator.isDateString(oResponse.outusr09),
													sMessage: this.oBundle.getText("Error018"),
												},
											]);
											aSortedData.push(oResponse);
										}
									});
									aMatchesMachineNo.push(oItem.MachineNo);
								}
							});
							oTable.sort();
							return Promise.resolve({ results: aSortedData });
							// Process data before output
						})
						.then(this._setResult.bind(this))
						.then(this._adjustTableContent.bind(this))
						.then(this._clearMessages.bind(this))
						.catch(this._resetMessages.bind(this))
						.finally(() => BusyIndicator.hide());
				}.bind(this);
				oFileReader.readAsArrayBuffer(oInputFile);
			},

			/**
			 * Handle register data
			 * @returns
			 */
			onPressSaveButton: Debounce(function () {
				const aMessages = [];
				const oTable = this._getTableControl();
				const aTableContext = this._getTableContextData(oTable);
				const aSelectedRows = aTableContext.filter((oItem) => oItem.bSelected);

				if (aSelectedRows.length === 0) {
					aMessages.push(Message.createErrorMessage(this.oBundle.getText("Error015")));
					return this._resetMessages(aMessages);
				}

				aSelectedRows.forEach((oItem) => {
					const sAdditionMessage = `\n(No : ${oItem.index}  項目名 : 組立可能日)`;
					// Validate when flag is X (active 組立可能日)
					if (oItem.outuser_status_flg === "X") {
						return;
					}
					const aValidateMessage = Validator._controlValidations(oItem, "outusr09", [
						{
							// Required check
							fnCheck: () => Validator.isRequired(oItem.outusr09),
							sMessage: this.oBundle.getText("Error017") + sAdditionMessage,
							sStateMessage: this.oBundle.getText("Error017"),
						},
						{
							// Date string check
							fnCheck: () => Validator.isDateString(oItem.outusr09),
							sMessage: this.oBundle.getText("Error018") + sAdditionMessage,
							sStateMessage: this.oBundle.getText("Error018"),
						},
					]);

					aValidateMessage.forEach((sMessage) => {
						aMessages.push(Message.createErrorMessage(sMessage));
					});
				});
				this._getTableModel().refresh();
				if (aMessages.length) {
					return this._resetMessages(aMessages);
				} else {
					this._updateOData(aSelectedRows)
						.then(this._outputSuccessMessages.bind(this))
						.catch(this._resetMessages.bind(this));
				}
			}, 500),

			/**
			 * Handle register data
			 */
			_updateOData: function (aUpdateData) {
				// Prepare update data
				// Filter items to register
				let aRegisterList = JSON.parse(JSON.stringify(aUpdateData));
				aRegisterList = aRegisterList.map((oInput) => {
					return {
						outno: oInput.outno?.trim(), // No
						outtxt04: oInput.outtxt04, // 組立可能日確認状況
						outusr09: oInput.outusr09?.trim().replaceAll("/", ""), // 組立可能日
						outku_ntanf: oInput.outku_ntanf?.trim().replaceAll("/", ""), // 組立開始日
						outzmemo: oInput.outzmemo, // メモ
						outz_kidai_no: oInput.outz_kidai_no, // 機台NO
						outz_eigyou_kishu: oInput.outz_eigyou_kishu, // 機種
						outarbpl: oInput.outarbpl, // 機種G
						outzesuisu: oInput.outzesuisu.trim().replaceAll(",", ""), // 錘数
						outusr01: oInput.outusr01, // 優先NO
						outzjuchu_kb: oInput.outzjuchu_kb, // 受注区分
						outzorder_name: oInput.outzorder_name, // 受注名称
						outztokushushiyoumuflg: oInput.outztokushushiyoumuflg, // 特殊仕様
						outztokushushiyoturokubi: oInput.outztokushushiyoturokubi, // 特殊仕様登録日
						outaudat: oInput.outaudat?.trim().replaceAll("/", ""), // 受注日
						outedatu: oInput.outedatu?.trim().replaceAll("/", ""), // 納入日
						outkunnr: oInput.outkunnr, // 納入先
						outname: oInput.outname, // 納入先名称
						outntend: oInput.outntend?.trim().replaceAll("/", ""), // 完成予定日
						outsh_ntanf: oInput.outsh_ntanf?.trim().replaceAll("/", ""), // 出荷予定日
						outzshireino: oInput.outzshireino, // 製造指令NO
						outerror_message: oInput.outerror_message, // エラーメッセージ
						outaufnr: oInput.outaufnr, // 指図番号
						outvornr: oInput.outvornr, // 活動（組立）
						outobjnr: oInput.outobjnr, // 対象番号（組立）
						exec_mode: this.sExec_mode, //実行区分
					};
				});

				BusyIndicator.show(0);
				return new Promise(
					function (fResolve, fReject) {
						let aMessages = [];
						const aResponseData = [];
						const oModel = this.getOwnerComponent().getModel();
						oModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
						oModel.setUseBatch(true);
						oModel.setDeferredGroups(["group1"]);

						// start batch processing
						const oParameters = {
							success: function (oResponse) {
								BusyIndicator.hide();
								aResponseData.push(oResponse);
								fResolve(aResponseData);
							}.bind(this),

							error: function (oResponse) {
								BusyIndicator.hide();
								const aResMessage = ErrorHandler.getMessagesResponse(oResponse);
								aMessages = [...aMessages, ...aResMessage];

								// Disable register button on Internal Server Error (500) - No.2204
								if (aResMessage.some((oErr) => oErr.statusCode === "500")) {
									this.byId("SaveButton").setEnabled(false);
								}

								fReject(aMessages);
							}.bind(this),
						};

						aRegisterList.forEach((oItem, index) => {
							oModel.create(`/${Constants.MAIN_PATH}`, oItem, {
								groupId: "group1",
								properties: oItem,
								changeSetId: index,
								...oParameters,
							});
						});
						// submit data after create, update and delete
						oModel.submitChanges({
							groupId: "group1",
						});
					}.bind(this)
				);
			},

			/**
			 * Output register success messages
			 */
			_outputSuccessMessages: function (aResponseData) {
				const aTable = this._getTableControl();
				const aTableContext = this._getTableContextData(aTable);
				const oErrorMessageColumn = this._getControlById("_IDGenColumn22");
				const aMessages = [];
				const aSuccessNo = aResponseData
					.filter((oItem) => !oItem.outerror_message?.trim())
					.map((oItem) => oItem.outno);
				const aFailItems = aResponseData.filter((oItem) => oItem.outerror_message?.trim());

				// autoResizeColumn
				aTable.attachEventOnce("rowsUpdated", () => {
					const aColumns = aTable.getColumns().filter((oColumn) => oColumn.getVisible());
					// エラーメッセージ列の column index を取得
					const iColIndex = aColumns?.findIndex(
						(oColumn) => oColumn.getName() === this.oBundle.getText("headerErrorMessage")
					);
					if (iColIndex !== -1) {
						// 指定列（index）の列幅を表示中の行データ(セル)に基づいてリサイズ
						aTable.autoResizeColumn(iColIndex);
					}
				});

				const aNewData = [];
				aTableContext.forEach((oItem) => {
					oItem.outerror_message = "";
					if (aSuccessNo.includes(oItem.outno?.trim().toString())) {
						oItem.bSelected = false;
						this._getScreenModel().setProperty("/bCheckAll", false); // Reset "Check All" state
						oItem.bIsActiveAssemblyAvailableDate = false;
						if (this.sExec_mode === "E") {
							oItem.outtxt04 = "登録済"; //組立可能日確認状況
						} else if (this.sExec_mode === "A") {
							oItem.outku_ntanf = oItem.outusr09; //組立開始日 = 組立可能日
							oItem.outtxt04 = "承認済"; //組立可能日確認状況
						}
						oItem.outuser_status_flg = "X";
					}
					aFailItems.forEach((oFail) => {
						if (oItem.index?.toString() === oFail.outno) {
							oItem.outerror_message = oFail.outerror_message;
						}
					});
					aNewData.push(oItem);
				});
				this._setODataTable(aNewData);
				this._getTableModel().refresh();

				const bExistErrorMsg = aNewData.some((oItem) => !!oItem.outerror_message);
				// Show success messsage
				if (aFailItems.length === 0) {
					const oMessage = Message.createSuccessMessage(this.oBundle.getText("SuccessPopup"));
					MessageBox.show(oMessage.description, {
						icon: MessageBox.Icon.SUCCESS,
						...oMessage,
					});
				} else {
					// Show error messsage
					oErrorMessageColumn.setVisible(bExistErrorMsg);
					const oMessage = Message.createErrorMessage(this.oBundle.getText("ErrorPopup"));
					MessageBox.show(oMessage.description, {
						icon: MessageBox.Icon.ERROR,
						...oMessage,
					});
				}

				// Show information messsage
				aMessages.push(
					Message.createInformationMessage(
						this.oBundle.getText("Infor024", [aSuccessNo.length, aFailItems.length])
					)
				);

				this._resetMessages(aMessages);
			},

			/**
			 * Handle connect to the Personalization service when start app
			 */
			_connectPersonalizationService: async function () {
				const oView = this.getView();
				const sIdVariant = UriParameters.fromQuery(window.location.search).get("variant-id");
				await Variant.connectPersonalizationService(oView, Constants.PROGRAM_ID, sIdVariant);
			},

			/**
			 * Handle show the button save when resort, and save in the curent variant
			 */
			onDisplaySaveButton: async function () {
				const oView = this.getView();
				Variant.onDisplaySaveButton(oView);
			},

			/**
			 * Column settings button event handler
			 * Initialize p13nDialog model and its open
			 */
			onP13nDialogPress: function () {
				P13nDialogPopup.onP13nDialogPress(Constants.PROGRAM_ID, this);
			},
			// End process
		});
	}
);
