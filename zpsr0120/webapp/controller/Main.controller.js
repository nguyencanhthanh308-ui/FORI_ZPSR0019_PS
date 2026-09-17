/* eslint-disable no-prototype-builtins */
sap.ui.define(
	[
		"sap/ui/core/mvc/Controller",
		"sap/base/i18n/ResourceBundle",
		"sap/base/strings/formatMessage",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"zpsr0120/model/models",
		"sap/ui/core/BusyIndicator",
		"sap/ui/model/json/JSONModel",
		"sap/m/MessageBox",
		"sap/base/util/UriParameters",
		"sap/ui/export/Spreadsheet",
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
		ResourceBundle,
		formatMessage,
		Filter,
		FilterOperator,
		models,
		BusyIndicator,
		JSONModel,
		MessageBox,
		UriParameters,
		Spreadsheet,
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

		const PROGRAM_ID = "zpsr0120";
		const MAIN_TABLE_MODEL_NAME = "oDataTable";

		const TABLE_DATE_PROPERTIES = ["zactdeldate", "zplandeldate", "zactdeldate2"];
		const TABLE_DATE_LABELS = ["検収日", "出荷指示日", "出荷日"];
		const TABLE_AMOUNT_LABELS = ["受注金額"];
		const TABLE_AMOUNT_PROPERTIES = ["kbetr"];
		const TABLE_NUMBER_LABELS = ["出荷指示数量", "号機", "明細番号"];
		const TABLE_NUMBER_PROPERTIES = ["zplandelnum", "zgokino", "posnr"];

		return Controller.extend("zpsr0120.controller.Main", {
			onInit: async function () {
				// Initialize Data Model
				this._initDataModel();

				// Get all data for pull down and search help
				this._getDataInitialModel();

				// Service variants
				await this._connectPersonalizationService();

				// Book mark
				Bookmark.initialBookmark.apply(this, [`/${MAIN_TABLE_MODEL_NAME}/$count`]);

				// Transfer URL parameter to filter value
				this._handleSetValueParamToFilter();
			},

			/**
			 * Override fn onAfterRendering
			 * @override
			 */
			onAfterRendering: function () {
				// Processing init table column config
				const oTable = this._getTableControl();
				const oSpecialItems = {
					aNumberItems: TABLE_NUMBER_LABELS,
					aAmountItems: TABLE_AMOUNT_LABELS,
					aDateItems: TABLE_DATE_LABELS,
				};
				this._oColumnConfig = Excel.createColumnConfig(oTable, oSpecialItems);
				// Override sap.ui.i18n.ResourceBundle._formatValue prevent log error message
				ResourceBundle.prototype._formatValue = this._formatValue;
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

			/**
			 *  Initialize Data Model
			 */
			_initDataModel: function () {
				const oView = this.getView();
				//model for i18n
				this.oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
				// Screen model
				oView.setModel(models.createMainScreenModel(), "screen");
				// Customer - 得意先
				oView.setModel(models.createInitialModel(), "CustomerModel");
				// ShipToParty - 納入先
				oView.setModel(models.createInitialModel(), "ShipToPartyModel");
			},

			/**
			 * Handle get all data for pull down and search help
			 */
			_getDataInitialModel: function () {
				// API: SalesOrganization[販売組織]
				this._readOData([], "SalesOrgSet")
					.then((oDataModel) => {
						this._setModelByName(oDataModel, "SalesOrganizationModel");
					})
					.catch(() => {
						this._setModelByName({ results: [] }, "SalesOrganizationModel");
					});

				// API: Customer[得意先]
				this._readOData([], "CustomerSet")
					.then((oDataModel) => {
						oDataModel.results.forEach((oItem) => (oItem.name = `${oItem.name1} ${oItem.name2}`));
						this._setModelByName(oDataModel, "CustomerModel");
					})
					.catch(() => {
						this._setModelByName({ results: [] }, "CustomerModel");
					});

				// API: ShipToParty[納入先]
				this._readOData([], "DeliveryDesSet")
					.then((oDataModel) => {
						oDataModel.results.forEach((oItem) => (oItem.name = `${oItem.name1} ${oItem.name2}`));
						this._setModelByName(oDataModel, "ShipToPartyModel");
					})
					.catch(() => {
						this._setModelByName({ results: [] }, "ShipToPartyModel");
					});

				// API: Check fixed data when first access screen
				this._readOData([], "FixedValueSet")
					.then(() => {
						return Promise.resolve();
					})
					.catch(this._resetMessages.bind(this));
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

					if (sName === "ProcessingType") {
						if (!["0", "1"].includes(jsonParseValue)) {
							jsonParseValue = 0;
						}
						jsonParseValue = parseInt(jsonParseValue || 0);
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
				return this.getView().getModel(MAIN_TABLE_MODEL_NAME);
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
				return oInputControl.getBindingContext(MAIN_TABLE_MODEL_NAME).getObject();
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
			 * Get current date format yyyyMMdd
			 */
			_getCurrenDate: function () {
				const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
					pattern: "yyyyMMdd",
				});
				return oDateFormat.format(new Date());
			},

			/**
			 * Get date of 36month before
			 * @returns
			 */
			_getSystemDateMinus36Months: function () {
				const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
					pattern: "yyyyMMdd",
				});
				const oDate = new Date();
				oDate.setMonth(oDate.getMonth() - 36);
				return oDateFormat.format(oDate);
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
				this.getView().setModel(new JSONModel(oData), MAIN_TABLE_MODEL_NAME);
			},

			// Event Handler

			/**
			 * Event handling when Search button pressed
			 */
			onPressSearchButton: Debounce(function () {
				//get filters from ScreenModel
				this._getFilters()
					// Clear all messages before search to avoid confusion with past messages - No.226
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
			 * Clear all messages and pass through data for chaining - No.226
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
				const oSalesOrganizationControl = this._getControlById("INVKORG");

				// FilterBar InstructionNo 指令No.
				if (Validator.isRequired(oFilter.InstructionNo)) {
					aFilters.push(new Filter("zshireino", FilterOperator.EQ, oFilter.InstructionNo));
				}

				// FilterBar Customer 得意先
				if (oFilter.Customer.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.Customer, "vbpa_ag_kunnr"));
				}

				// FilterBar ShipToParty 納入先
				if (oFilter.ShipToParty.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.ShipToParty, "vbpa_we_kunnr"));
				}

				// FilterBar SalesOrderNo 受注番号
				if (Validator.isRequired(oFilter.SalesOrderNo)) {
					aFilters.push(new Filter("vbeln", FilterOperator.Contains, oFilter.SalesOrderNo));
				}

				// FilterBar ProcessingType 処理区分
				if (oFilter.ProcessingType === 0) {
					aFilters.push(new Filter("outzflag", FilterOperator.EQ, "0"));
				} else {
					aFilters.push(
						new Filter({
							filters: [
								new Filter("outzflag", FilterOperator.EQ, "4"),
								new Filter("outzflag", FilterOperator.EQ, "6"),
							],
							and: false,
						})
					);
				}

				/**
				 * FilterBar SalesOrganization 販売組織
				 * Check Required 3-1.項目ﾁｪｯｸ基準書
				 */
				if (oFilter.SalesOrganization.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.SalesOrganization, "vkorg"));
				} else {
					aMessages.push(Message.createErrorMessage(this.oBundle.getText("Error004", ["必須項目"])));
				}

				// Toggle value state
				Validator._controlValidations(oSalesOrganizationControl, "", [
					{
						fnCheck: () => oFilter.SalesOrganization.length,
						sMessage: this.oBundle.getText("Error004", ["必須項目"]),
					},
				]);

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
			 * OData model read data
			 */
			_readOData: function (aFilters, sPath = "DisplayDataSet", bIsSubModel = false) {
				if (sPath === "DisplayDataSet") {
					BusyIndicator.show(0);
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
								if (sPath === "DisplayDataSet") {
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
					return Promise.reject([Message.createErrorMessage(this.oBundle.getText("Error005"))]);
				}

				this._handleInitODataTable(oData.results);
				this._initialSortProperties(oData.results);
				this._setODataTable(oData.results);
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
				const oErrorMessageColumn = this._getControlById("_IDGenColumn19");
				let bExistErrorMessage = false;

				const aTableContext = this._getTableContextData(oTable);
				aTableContext.forEach((oItem, index) => {
					oItem.index = index + 1;
					if (oItem.out_er_msg) {
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
					// condenses amount items
					oItem.kbetr = oItem.kbetr?.trim();

					// Init item 検収日 blank value
					if (!oItem.bIsFromExcel) {
						oItem.zactdeldate = "";
					}

					TABLE_DATE_PROPERTIES.forEach((sDate) => {
						oItem[sDate] = Formatter.onFormatDisplayDate(oItem[sDate]);
					});

					// Determine active item 検収日
					oItem.bIsActiveInspectionDate = oItem.outzflag === "B1";
				});
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
				const aSortField = [...TABLE_AMOUNT_PROPERTIES, ...TABLE_NUMBER_PROPERTIES];
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
				const oSource = oEvent.getSource();
				const aDependents = oSource.getDependents();
				const oDependent = aDependents[0];
				if (oDependent) {
					oDependent.toggle(oSource);
				}
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
			 * 検索条件部の［処理区分］を除く すべての項目 に対し、入力値をブランクに設定する。
			 */
			onPressClearButton: function () {
				const oScreenModel = this._getScreenModel();
				(oScreenModel.setProperty("/InstructionNo", ""),
					oScreenModel.setProperty("/Customer", []),
					oScreenModel.setProperty("/ShipToParty", []),
					oScreenModel.setProperty("/SalesOrderNo", ""),
					oScreenModel.setProperty("/SalesOrganization", []),
					this._resetMessages([]));
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

				// Customer - 得意先
				// ShipToParty - 納入先
				if (sName === "Customer" || sName === "ShipToParty") {
					oColumns = {
						SalesOrganization: "vkorg",
						CustomerCode: "kunnr",
						Name: "name",
					};
				}

				// Init property for dialog
				const aFilters = this._getValueHelpFilterByName(sName);
				ValueHelpDialog.onMultiValueHelpRequest.apply(this, [
					PROGRAM_ID,
					oControl,
					sTitle,
					oColumns,
					aFilters,
					[],
					["Customer", "ShipToParty"],
				]);
			},

			/**
			 * Obtain filters for value help and suggestion
			 */
			_getValueHelpFilterByName: function (sName) {
				const aFilters = [];
				const oScreenModel = this._getScreenModel();

				// 出荷先(ShipToParty) + 得意先(Customer)
				if (sName === "Customer" || sName === "ShipToParty") {
					const aSalesOrganization = oScreenModel.getProperty("/SalesOrganization");
					if (aSalesOrganization.length) {
						const oSalesOrganization = this._getFiltersFromTokenModel(aSalesOrganization, "vkorg");
						aFilters.push(oSalesOrganization);
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
			 * Show all item when use suggestion
			 */
			onSuggest: function (oEvent) {
				const aFilters = [];
				const oSource = oEvent.getSource();
				const sName = oSource.getName();

				const aSuggeststionItem =
					oSource.getSuggestionItems().length === 0
						? oSource.getSuggestionRows()
						: oSource.getSuggestionItems();
				const sInputValue = oEvent.getParameter("suggestValue");
				if (aSuggeststionItem.length > 0) {
					const sPath =
						aSuggeststionItem[0].getBindingInfo("text")?.binding?.sPath ||
						aSuggeststionItem[0].getBindingInfo("text")?.parts?.[0].path ||
						oSource.getSuggestionRows()[0].getCells()[0].getBindingInfo("text")?.binding.sPath;
					if (sPath) {
						aFilters.push(new Filter(sPath, FilterOperator.Contains, sInputValue));
					}
				}
				const oLabel = oSource.getSuggestionColumns()[0]?.getHeader() || undefined;
				const oBinding = oSource.getBinding("suggestionItems") || oSource.getBinding("suggestionRows");

				const oFilterByName = this._getValueHelpFilterByName(sName);

				oBinding?.filter([...aFilters, ...oFilterByName]);
				if (oLabel) {
					oLabel.setText(
						this.oBundle.getText(oLabel.getBindingInfo("text")?.binding.sPath) + ` (${oBinding.iLength})`
					);
				}
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
			 * Handle validation InspectionDateReflection
			 */
			onChangeInspectionDateReflection: function (oEvent) {
				const oInspectionDateControl = oEvent.getSource();
				const sValue = oInspectionDateControl.getValue();

				Validator._controlValidations(oInspectionDateControl, "", [
					{
						fnCheck: () => !sValue || Validator.isDateString(sValue),
						sMessage: this.oBundle.getText("Error013"),
					},
				]);
			},

			/**
			 * Handle press reflection button
			 */
			onPressReflectionButton: function () {
				const aMessages = [];
				const oTable = this._getTableControl();
				const oScreenModel = this._getScreenModel();
				const aTableContext = this._getTableContextData(oTable);

				const aSelectedIndices = oTable.getSelectedIndices();
				const sInspectionDateReflection = oScreenModel.getProperty("/InspectionDateReflection");
				const oInspectionDateControl = this._getControlById("BULKZACTDELDATE");
				const aSelectedRows = aTableContext.filter((oItem, index) => aSelectedIndices.includes(index));
				const aTypeB1Rows = aSelectedRows.filter((oItem) => oItem.outzflag === "B1");

				// 一覧上の対象行選択チェックボックスがすべて OFF の状態でボタンを押下した場合
				if (!aSelectedIndices.length) {
					aMessages.push(Message.createErrorMessage(this.oBundle.getText("Error006")));
					return this._resetMessages(aMessages);
				}

				// Validation エラーが発生している場合 ※ メッセージ通知は行わず、処理を中断する
				const aResult = Validator._controlValidations(oInspectionDateControl, "", [
					{
						fnCheck: () => !sInspectionDateReflection || Validator.isDateString(sInspectionDateReflection),
						sMessage: this.oBundle.getText("Error013"),
					},
				]);

				if (!aResult.length) {
					const sCurrentDate = this._getCurrenDate();
					const sDateOf36MonthBefore = this._getSystemDateMinus36Months();
					aTypeB1Rows.forEach((oItem) => {
						oItem.zactdeldate = sInspectionDateReflection;
						Validator._controlValidations(oItem, "zactdeldate", [
							{
								// Required check
								fnCheck: () => Validator.isRequired(oItem.zactdeldate),
								sMessage: this.oBundle.getText("Error012"),
							},
							{
								// Date string check
								fnCheck: () => Validator.isDateString(oItem.zactdeldate),
								sMessage: this.oBundle.getText("Error013"),
							},
							{
								// Check input date in future
								fnCheck: () => sCurrentDate >= oItem.zactdeldate?.replace(/[-/]/g, ""),
								sMessage: this.oBundle.getText("Error015"),
							},
							{
								// Check input date in future
								fnCheck: () => oItem.zactdeldate?.replace(/[-/]/g, "") >= sDateOf36MonthBefore,
								sMessage: this.oBundle.getText("Error016"),
							},
						]);
					});
					this._resetMessages([]);
					this._getTableModel().refresh();
				}
			},

			/**
			 * Handle on row selection change
			 * @param {sap.ui.base.Event} oEvent
			 */
			onRowSelectionChange: function (oEvent) {
				const oSource = oEvent.getSource();
				const oParamerters = oEvent.getParameters();
				const oRowContext = oParamerters.rowContext?.getObject();
				const aTableContext = this._getTableContextData(oSource);
				if (!oRowContext || !oParamerters.userInteraction) {
					return;
				}
				const bIsSelected = oSource.isIndexSelected(oParamerters.rowIndex);
				const sInspectionDate = oRowContext.zactdeldate;
				const sProcessingType = oRowContext.outzflag;

				/**
				 * 隠し項目［処理区分］の値 = "B1"(検収登録) AND ［検収日］ = ブランク（""）
				 * ［検収日］に システム日付（編集時の日付、当日） を設定する。
				 */
				if (bIsSelected && !sInspectionDate && sProcessingType === "B1") {
					oRowContext.zactdeldate = this._getCurrenDate();
					// Clear state
					delete oRowContext.zactdeldateState;
					delete oRowContext.zactdeldateText;
				}

				if (oParamerters.selectAll && oParamerters.userInteraction) {
					aTableContext.forEach((oContext) => {
						const sInspectionDate = oContext.zactdeldate;
						const sProcessingType = oContext.outzflag;
						if (!sInspectionDate && sProcessingType === "B1") {
							oContext.zactdeldate = this._getCurrenDate();
							// Clear state
							delete oContext.zactdeldateState;
							delete oContext.zactdeldateText;
						}
					});
				}
				this._getTableModel().refresh();
			},

			/**
			 * handle on press download standard button
			 */
			onPressDownloadButton: function () {
				const oTable = this._getTableControl();
				const aDataSource = this._getTableContextData(oTable);
				const aCols = this._oColumnConfig;
				const oFormatItems = {
					aNumberItems: TABLE_NUMBER_PROPERTIES,
					aAmountItems: TABLE_AMOUNT_PROPERTIES,
					aDateItems: TABLE_DATE_PROPERTIES,
				};
				Excel.handleDownloadExcel(aDataSource, aCols, oFormatItems, PROGRAM_ID);
			},

			/**
			 * Handle press export format button
			 * 	Excelファイルを実行ユーザのローカルPCに出力する。
			 * 	ファイル内容は、「取込フォーマット」シートの列名(1行目)のみ。
			 */
			onPressExportFormatButton: function () {
				const aColumnLabels = ["No", "機台NO", "検収日"];
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
					fileName: `ZPSR0120_Format_Import`,
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
						const aMessages = [Message.createErrorMessage(this.oBundle.getText("Error007"))];
						return this._resetMessages(aMessages);
					}
				}
			},

			/**
			 * Handle show message on type miss match
			 * 入力ファイル形式（拡張子）が .xlsx 形式でない場合
			 */
			onTypeMissMatch: function () {
				const aMessages = [Message.createErrorMessage(this.oBundle.getText("Error007"))];
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
						if (oInputDataItem.hasOwnProperty(sKey)) {
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
						検収日: "InspectionDate",
						機台NO: "MachineNo",
					};

					// Read data from file
					Array.isArray(aExcelData) &&
						aExcelData.forEach((oExcelItem, index) => {
							const aInputKeys = Object.keys(oRegisterKeys);
							const aDateItems = ["検収日"];
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
						const aMessages = [Message.createErrorMessage(this.oBundle.getText("Error007"))];
						return this._resetMessages(aMessages);
					}

					aFilters.push(new Filter("outzflag", FilterOperator.EQ, "0"));
					const aMachineFilters = aResultData.map(
						(oItem) => new Filter("posid", FilterOperator.EQ, oItem.MachineNo)
					);
					aFilters.push(
						new Filter({
							filters: aMachineFilters,
							and: false,
						})
					);
					BusyIndicator.show(0);
					this._readOData(aFilters, "ImportExcelSet")
						.then((oData) => {
							const aResponseData = oData.results || [];
							const aSortedData = [];
							const aMatchesMachineNo = [];
							const sCurrentDate = this._getCurrenDate();
							const sDateOf36MonthBefore = this._getSystemDateMinus36Months();

							// Sort by MachineNo
							aResultData.forEach((oItem) => {
								if (!aMatchesMachineNo.includes(oItem.MachineNo)) {
									aResponseData.forEach((oResponse) => {
										if (oResponse.posid === oItem.MachineNo) {
											oResponse.zactdeldate = oItem.InspectionDate;
											oResponse.bIsFromExcel = true;
											Validator._controlValidations(oResponse, "zactdeldate", [
												{
													// Required check
													fnCheck: () => Validator.isRequired(oResponse.zactdeldate),
													sMessage: this.oBundle.getText("Error012"),
												},
												{
													// Date string check
													fnCheck: () => Validator.isDateString(oResponse.zactdeldate),
													sMessage: this.oBundle.getText("Error013"),
												},
												{
													// Check input date in future
													fnCheck: () =>
														sCurrentDate >= oResponse.zactdeldate?.replace(/[-/]/g, ""),
													sMessage: this.oBundle.getText("Error015"),
												},
												{
													// Check input date in future
													fnCheck: () =>
														oResponse.zactdeldate?.replace(/[-/]/g, "") >=
														sDateOf36MonthBefore,
													sMessage: this.oBundle.getText("Error016"),
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
						.catch(this._resetMessages.bind(this))
						.finally(() => BusyIndicator.hide());
				}.bind(this);
				oFileReader.readAsArrayBuffer(oInputFile);
			},

			/**
			 * Handle live change 検収日 select row
			 * @param {sap.ui.base.Event} oEvent
			 */
			onLiveChangeInspectionDate: function (oEvent) {
				const oControl = oEvent.getSource();
				const oTable = this._getTableControl();
				const aTableContext = this._getTableContextData(oTable);
				const oRowData = this._getTableRowContext(oControl);
				const iRowIndex = aTableContext.indexOf(oRowData);
				oTable.addSelectionInterval(iRowIndex, iRowIndex);
			},

			/**
			 * Handle change 検収日  validate select row
			 * @param {sap.ui.base.Event} oEvent
			 */
			onChangeInspectionDate: function (oEvent) {
				const oControl = oEvent.getSource();
				const oRowData = this._getTableRowContext(oControl);
				const sCurrentDate = this._getCurrenDate();
				const sDateOf36MonthBefore = this._getSystemDateMinus36Months();
				const sInspectionDate = oRowData.zactdeldate;

				Validator._controlValidations(oRowData, "zactdeldate", [
					{
						// Required check
						fnCheck: () => Validator.isRequired(oRowData.zactdeldate),
						sMessage: this.oBundle.getText("Error012"),
					},
					{
						// Date string check
						fnCheck: () => Validator.isDateString(oRowData.zactdeldate),
						sMessage: this.oBundle.getText("Error013"),
					},
					{
						// Check input date in future
						fnCheck: () => sCurrentDate >= sInspectionDate?.replace(/[-/]/g, ""),
						sMessage: this.oBundle.getText("Error015"),
					},
					{
						// Check input date in future
						fnCheck: () => sInspectionDate?.replace(/[-/]/g, "") >= sDateOf36MonthBefore,
						sMessage: this.oBundle.getText("Error016"),
					},
				]);
				this._getTableModel().refresh();
			},

			/**
			 * Handle register data
			 * @returns
			 */
			onPressSaveButton: Debounce(function () {
				const aMessages = [];
				const oTable = this._getTableControl();
				const aContextData = this._getTableContextData(oTable);
				const aSelectedIndices = oTable.getSelectedIndices();
				const sCurrentDate = this._getCurrenDate();
				const sDateOf36MonthBefore = this._getSystemDateMinus36Months();

				if (aSelectedIndices.length === 0) {
					aMessages.push(Message.createErrorMessage(this.oBundle.getText("Error010")));
					return this._resetMessages(aMessages);
				}

				const aSelectedItems = aContextData.filter((oItem, index) => aSelectedIndices.includes(index));

				aSelectedItems.forEach((oItem) => {
					const sAdditionMessage = `\n(No : ${oItem.index}  項目名 : 検収日)`;
					// Validate when flag is B1 (active 検収日)
					if (oItem.outzflag === "B1") {
						const aValidateMessage = Validator._controlValidations(oItem, "zactdeldate", [
							{
								// Required check
								fnCheck: () => Validator.isRequired(oItem.zactdeldate),
								sMessage: this.oBundle.getText("Error014") + sAdditionMessage,
								sStateMessage: this.oBundle.getText("Error012"),
							},
							{
								// Date string check
								fnCheck: () => Validator.isDateString(oItem.zactdeldate),
								sMessage: this.oBundle.getText("Error013") + sAdditionMessage,
								sStateMessage: this.oBundle.getText("Error013"),
							},
							{
								// Check input date in future
								fnCheck: () => sCurrentDate >= oItem.zactdeldate?.replace(/[-/]/g, ""),
								sMessage: this.oBundle.getText("Error015") + sAdditionMessage,
								sStateMessage: this.oBundle.getText("Error015"),
							},
							{
								// Check input date in future
								fnCheck: () => oItem.zactdeldate?.replace(/[-/]/g, "") >= sDateOf36MonthBefore,
								sMessage: this.oBundle.getText("Error016") + sAdditionMessage,
								sStateMessage: this.oBundle.getText("Error016"),
							},
						]);

						aValidateMessage.forEach((sMessage) => {
							aMessages.push(Message.createErrorMessage(sMessage));
						});
					}
				});
				this._getTableModel().refresh();
				if (aMessages.length) {
					return this._resetMessages(aMessages);
				} else {
					this._updateOData(aSelectedItems)
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
				aRegisterList = aRegisterList.map(
					({ vbeln, posnr, posid, zactdeldate, zplandelnum, outzflag, index }) => {
						return {
							no: index?.toString(),
							vbeln,
							posnr,
							posid,
							zactdeldate: zactdeldate?.replaceAll("/", ""),
							zplandelnum,
							outzflag,
						};
					}
				);

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
								const bExist500Error = aMessages.some((oMessage) => oMessage.statusCode === "500");
								if (bExist500Error) {
									this.byId("SaveButton").setEnabled(false);
								}
								fReject(aMessages);
							}.bind(this),
						};

						aRegisterList.forEach((oItem, index) => {
							oModel.create("/DisplayDataSet", oItem, {
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
				const oTable = this._getTableControl();
				const aTableContext = this._getTableContextData(oTable);
				const oErrorMessageColumn = this._getControlById("_IDGenColumn19");
				const aMessages = [];
				const aSuccessNo = aResponseData.filter((oItem) => !oItem.out_er_msg?.trim()).map((oItem) => oItem.no);
				const aFailItems = aResponseData.filter((oItem) => oItem.out_er_msg?.trim());

				const aNewData = [];
				aTableContext.forEach((oItem) => {
					if (aSuccessNo.includes(oItem.index?.toString())) {
						return;
					}
					aFailItems.forEach((oFail) => {
						if (oItem.index?.toString() === oFail.no) {
							oItem.out_er_msg = oFail.out_er_msg;
						}
					});
					aNewData.push(oItem);
				});

				this._setODataTable(aNewData);
				const bExistErrorMsg = aNewData.some((oItem) => !!oItem.out_er_msg);
				oErrorMessageColumn.setVisible(bExistErrorMsg);
				// Show information messsage
				aMessages.push(
					Message.createInformationMessage(
						this.oBundle.getText("Infor011", [aSuccessNo.length, aFailItems.length])
					)
				);
				this._resetMessages(aMessages);

				// 指定列（index）の列幅を表示中の行データ(セル)に基づいてリサイズ
				// Auto resize column by column index
				setTimeout(() => {
					const oTargetColumn = this._getControlById("_IDGenColumn19");
					const aColumns = oTable.getColumns();
					const aVisibleColumn = aColumns.filter((oColumn) => oColumn.getVisible());
					// エラーメッセージ列の column index を取得
					const iColIndex = aVisibleColumn.indexOf(oTargetColumn);
					oTable.autoResizeColumn(iColIndex);
				}, 0);
			},

			/**
			 * Handle connect to the Personalization service when start app
			 */
			_connectPersonalizationService: async function () {
				const oView = this.getView();
				const sIdVariant = UriParameters.fromQuery(window.location.search).get("variant-id");
				await Variant.connectPersonalizationService(oView, PROGRAM_ID, sIdVariant);
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
				P13nDialogPopup.onP13nDialogPress(PROGRAM_ID, this);
			},

			// End process
		});
	}
);
