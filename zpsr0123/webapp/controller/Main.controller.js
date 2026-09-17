sap.ui.define(
	[
		"sap/base/util/UriParameters",
		"sap/ui/core/mvc/Controller",
		"sap/ui/core/BusyIndicator",
		"sap/ui/export/Spreadsheet",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"sap/ui/model/json/JSONModel",
		"sap/m/MessageBox",
		"../model/models",
		"../handler/constants/constants",
		"../handler/controlHandler/valueHelpDialog",
		"../handler/controlHandler/p13nDialog",
		"../handler/controlHandler/variant",
		"../handler/controlHandler/excel",
		"../handler/controlHandler/bookmark",
		"../handler/errorHandler/ErrorHandler",
		"../handler/formatter/formatter",
		"../handler/helper/Validator",
		"../handler/helper/Message",
		"../handler/debounce/debounce",
	],
	function (
		UriParameters,
		Controller,
		BusyIndicator,
		Spreadsheet,
		Filter,
		FilterOperator,
		JSONModel,
		MessageBox,
		models,
		Constants,
		ValueHelpDialog,
		P13nDialog,
		Variant,
		Excel,
		Bookmark,
		ErrorHandler,
		Formatter,
		Validator,
		Message,
		Debounce
	) {
		"use strict";

		return Controller.extend("zpsr0123.controller.Main", {
			onInit: async function () {
				// Initialize Data Model
				this._initDataModel();

				// Get all data for pull down and search help
				this._getDataInitialModel();

				// Service variants
				await this._connectPersonalizationService();

				// Book mark
				Bookmark.initialBookmark.apply(this, [`/${Constants.MAIN_PATH}/$count`, ["filterbar1"]]);

				// Transfer URL parameter to filter value
				this._handleSetValueParamToFilter();
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
				// [プラント] model
				oView.setModel(models.createInitialModel(), "PlantModel");
				// [受注区分] model
				oView.setModel(models.createOrderTypeModel(), "OrderTypeModel");
				// [記事欄] model
				oView.setModel(models.createRemarksFieldModel(), "RemarksFieldModel");

				// Add event press for DatePicker
				const oDateElement = this.byId("INNTANF"); // [組立月]
				oDateElement.addEventDelegate(
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
					this._readOData([], "SearchPlantSet").then((oData) => {
						this._setModelByName(oData, "PlantModel");
					}),
				];

				Promise.all(promises)
					.then(() => BusyIndicator.hide())
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

					// [ソート順]
					if (sName === "SortOrder") {
						jsonParseValue = jsonParseValue === "0" ? 0 : 1;
					}

					// [親子指令]
					if (sName === "MasterSubOrder") {
						jsonParseValue = jsonParseValue === "X";
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
			 * Handle connect to the Personalization service when start app
			 */
			_connectPersonalizationService: async function () {
				const oView = this.getView();
				const sIdVariant = UriParameters.fromQuery(window.location.search).get("variant-id");
				await Variant.connectPersonalizationService(oView, Constants.PROGRAM_ID, sIdVariant);
			},

			// *** GETTER *** //
			/**
			 * Get OData model
			 */
			_getOdataModel: function () {
				return this.getOwnerComponent().getModel();
			},

			/* Get Sub odata */
			_getSubOdataModel: function () {
				return this.getOwnerComponent().getModel("subModel");
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
				const aTableContext = oBinding.getAllCurrentContexts();
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
			 * Set OData table
			 * @param {Object[]}
			 */
			_setODataTable: function (oData) {
				this._getScreenModel().setProperty("/RowCount", oData.length);
				this.getView().setModel(new JSONModel(oData), Constants.MAIN_TABLE_MODEL_NAME);
			},

			// *** READ ODATA *** //
			/**
			 * OData model read data
			 */
			_readOData: function (aFilters, sPath = Constants.MAIN_PATH, bIsSubModel = false) {
				if (sPath === Constants.MAIN_PATH) {
					BusyIndicator.show(0);
					// Reset register buttons after the main table reloads - No.2204
					this.byId("SaveButton").setEnabled(true);
					this.byId("SaveButtonRemarksOnly").setEnabled(true);
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

			// *** HANDLE SEARCH BUTTON *** //
			/**
			 * Event handling when Search button pressed
			 */
			onPressSearchButton: Debounce(function () {
				// get filters from ScreenModel
				this._getFilters()
					// Clear all messages before search to avoid confusion with past messages - No.2204
					.then(this._removeAllMessages.bind(this))
					// retrieve data
					.then(this._readOData.bind(this))
					// set retrieved data to ScreenModel
					.then(this._setResult.bind(this))
					// handle bind variant after search
					.then(this._handleBindVariantAfterSearch.bind(this))
					// Re-index
					.then(this._adjustTableContent.bind(this))
					// clear all messages
					.then(this._clearMessages.bind(this))
					// when error occurs above, output messages
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
				const oPlantControl = this._getControlById("INWERKS"); // [プラント]
				const oAssemblyMonthControl = this._getControlById("INNTANF"); // [組立月]

				// Plant - [プラント]
				if (oFilter.Plant.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.Plant, "inwerks"));
				}

				// Required validation: Plant - [プラント]
				const aPlantResults = Validator._controlValidations(oPlantControl, "", [
					{
						fnCheck: () => oFilter.Plant.length,
						sMessage: this.oBundle.getText("Error016"),
					},
				]);
				if (aPlantResults.length) {
					aMessages.push(Message.createErrorMessage(aPlantResults[0]));
				}

				// Assembly Month - 組立月
				if (oFilter.AssemblyMonth) {
					const oAssemblyMonth = new Date(oFilter.AssemblyMonth);
					aFilters.push(
						new Filter("inntanf", FilterOperator.EQ, Formatter.dateInputFormatter(oAssemblyMonth, "yyyyMM"))
					);
				}

				// Date format validation: Assembly Month - 組立月
				const aAssemblyResults = Validator._controlValidations(oAssemblyMonthControl, "", [
					{
						fnCheck: () => !oFilter.AssemblyMonth || Validator.isDateString(oFilter.AssemblyMonth),
						sMessage: this.oBundle.getText("ErrorInvalidDate"),
					},
				]);
				if (aAssemblyResults.length) {
					aMessages.push(Message.createErrorMessage(aAssemblyResults[0]));
				}

				// Logic Model - ロジック機種
				if (oFilter.LogicModel.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.LogicModel, "inz_logic_kishu"));
				}

				// Machine No - 機台NO
				if (oFilter.MachineNo) {
					aFilters.push(new Filter("inz_kidai_no", FilterOperator.Contains, oFilter.MachineNo));
				}

				// Master Sub Order - 親子指令
				if (oFilter.MasterSubOrder) {
					aFilters.push(new Filter("inincl_paorder", FilterOperator.EQ, "X"));
				}

				// Order Type - 受注区分
				aFilters.push(new Filter("inzjuchu_kb", FilterOperator.EQ, oFilter.OrderType));

				// Remarks Field - 記事欄
				aFilters.push(new Filter("intline", FilterOperator.EQ, oFilter.RemarksField));

				// Sort Order - ソート順
				if (oFilter.SortOrder !== undefined) {
					aFilters.push(new Filter("insort", FilterOperator.EQ, oFilter.SortOrder === 0 ? "B1" : "B2"));
				}

				if (aMessages.length) {
					return Promise.reject(aMessages);
				} else {
					return Promise.resolve(aFilters);
				}
			},

			/**
			 * Handle validation [組立月]
			 */
			onChangeAssemblyMonth: function (oEvent) {
				const oAssemblyMonthControl = oEvent.getSource();
				const sValue = oAssemblyMonthControl.getValue();

				Validator._controlValidations(oAssemblyMonthControl, "", [
					{
						fnCheck: () => Validator.isDateString(sValue),
						sMessage: this.oBundle.getText("ErrorInvalidDate"),
					},
				]);
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
			 * Set retrieved data to view
			 */
			_setResult: function (oData) {
				// Check exist data
				if (oData.results.length === 0) {
					this._setODataTable([]);
					return Promise.reject([Message.createErrorMessage(this.oBundle.getText("Error013"))]);
				}

				this._handleInitODataTable(oData.results);
				this._initialSortProperties(oData.results);
				this._setODataTable(oData.results);
				return Promise.resolve();
			},

			/**
			 * Handle init data of table
			 * @param {Object[]} aDataTable
			 */
			_handleInitODataTable: function (aDataTable) {
				aDataTable.forEach((oItem) => {
					// Format date to yyyy/MM/dd
					Constants.TABLE_DATE_PROPERTIES.forEach((sDate) => {
						oItem[sDate] = Formatter.onFormatDisplayDate(oItem[sDate]);
					});
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
				const aSortField = [...Constants.TABLE_AMOUNT_PROPERTIES, ...Constants.TABLE_NUMBER_PROPERTIES];
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
			 * Adjust Table Content
			 * Re-arange index
			 * Select all checkbox
			 * Visible columns エラーメッセージ
			 */
			_adjustTableContent: function () {
				const oTable = this._getTableControl();
				const oErrorMessageColumn = this._getControlById("_IDGenColumn28"); // [エラーメッセージ]
				let bExistErrorMessage = false;

				const aTableContext = this._getTableContextData(oTable);
				aTableContext.forEach((oItem, index) => {
					oItem.index = index + 1;
					if (oItem.outerror_message) {
						bExistErrorMessage = true;
					}
				});

				// Display column [エラーメッセージ if exist value
				oErrorMessageColumn?.setVisible(bExistErrorMessage);
				this._setODataTable(aTableContext);
				return Promise.resolve();
			},

			// *** HANDLE MESSAGE *** //
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

			// *** HANDLE CLEAR BUTTON *** //
			onPressClearButton: function () {
				const oScreenModel = this._getScreenModel();
				(oScreenModel.setProperty("/Plant", []), // [プラント]
					oScreenModel.setProperty("/AssemblyMonth", null), // [組立月]
					oScreenModel.setProperty("/LogicModel", []), // [ロジック機種]
					oScreenModel.setProperty("/MachineNo", []), // [機台NO]
					oScreenModel.setProperty("/MasterSubOrder", false), // [親子指令]
					oScreenModel.setProperty("/OrderType", ""), // [受注区分]
					oScreenModel.setProperty("/RemarksField", ""), // [記事欄]
					this._resetMessages([]));
			},

			// *** HANDLE VALUE HELP *** //
			/**
			 * Handle Open Multi Value Help Request
			 * @param {*} oEvent
			 */
			onMultipleConditionsVHRequested: function (oEvent) {
				const oControl = oEvent.getSource();
				const sName = oControl.getName();
				const sTitle = this.oBundle.getText(`filter${sName}`);
				const oColumns = {};
				const aFilters = [];

				// Init property for dialog
				ValueHelpDialog.onMultiValueHelpRequest.apply(this, [
					Constants.PROGRAM_ID,
					oControl,
					sTitle,
					oColumns,
					aFilters,
					["LogicModel"], // Only tab conditions
				]);
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

			// *** HANDLE REFLECT BUTTON *** //
			/**
			 * Toggle display reflection component
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
			 * Handle validation [出荷可能日]
			 */
			onChangeShippingnDateReflection: function (oEvent) {
				const oInspectionDateControl = oEvent.getSource();
				const sValue = oInspectionDateControl.getValue();

				Validator._controlValidations(oInspectionDateControl, "", [
					{
						fnCheck: () => !sValue || Validator.isDateString(sValue),
						sMessage: this.oBundle.getText("Error017"),
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
				const sShippingnDateReflection = oScreenModel.getProperty("/AvailableShippingnDate");
				const oShippingnDateControl = this._getControlById("BULKUSR08");
				const aSelectedRows = aTableContext.filter((oItem, index) => aSelectedIndices.includes(index));

				if (!aSelectedIndices.length) {
					aMessages.push(Message.createErrorMessage(this.oBundle.getText("Error015")));
					return this._resetMessages(aMessages);
				}

				const aResult = Validator._controlValidations(oShippingnDateControl, "", [
					{
						fnCheck: () => !sShippingnDateReflection || Validator.isDateString(sShippingnDateReflection),
						sMessage: this.oBundle.getText("Error017"),
					},
				]);

				if (aResult.length) {
					return;
				}

				aSelectedRows.forEach(async (oItem) => {
					// Set［出荷可能日］=［出荷可能日(一括入力用)］
					oItem.outsh_usr08 = sShippingnDateReflection;

					if (oItem.outsh_usr08) {
						// Fetch [搬入可能日] by [出荷可能日]
						try {
							await this._fetchDeliveryDate(oItem);
						} catch (error) {
							console.error(error);
						}
					}
				});
				this._resetMessages([]);
				this._getTableModel().refresh();
			},

			// *** HANDLE EXCEL *** //
			/**
			 * Handle dowload file excel
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
				const aColumnLabels = ["No", "機台NO", "出荷可能日", "記事欄"];
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
					fileName: `ZPSR0123_Format_Import`,
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
			 * Handle import file excel
			 */
			onPressImportExcelButton: function () {
				const oImportControl = this.getView().byId("ExcelBtn");
				const oDomRef = oImportControl.FUEl;
				const oInputFile = oDomRef.files[0];
				const aAceptFileType = [
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					"application/vnd.ms-excel",
				];

				// Validate: invalid file format (.xlsx required)
				if (oInputFile) {
					if (aAceptFileType.includes(oInputFile.type)) {
						this._handleUploadFile(oInputFile);
					} else {
						const aMessages = [Message.createErrorMessage(this.oBundle.getText("Error012"))];
						return this._resetMessages(aMessages);
					}
				}
			},

			/**
			 * Handle show message on type miss match
			 */
			onTypeMissMatch: function () {
				const aMessages = [Message.createErrorMessage(this.oBundle.getText("Error012"))];
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
						機台NO: "MachineNo",
						出荷可能日: "AvailableShippingDate",
						記事欄: "Remarks",
					};

					// Read data from file
					Array.isArray(aExcelData) &&
						aExcelData.forEach((oExcelItem, index) => {
							const aInputKeys = Object.keys(oRegisterKeys);
							const aDateItems = ["出荷可能日"];
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

					// Validate: no records (row 2 empty) or missing [機台NO]
					const bEmptyMachineNo = aResultData.some((oItem) => !oItem.MachineNo);
					if (!aResultData.length || bEmptyMachineNo) {
						const aMessages = [Message.createErrorMessage(this.oBundle.getText("Error012"))];
						return this._resetMessages(aMessages);
					}

					const aMachineFilters = aResultData.map(
						(oItem) => new Filter("outz_kidai_no", FilterOperator.EQ, oItem.MachineNo)
					);
					aFilters.push(
						new Filter({
							filters: aMachineFilters,
							and: false,
						})
					);
					BusyIndicator.show(0);
					this._readOData(aFilters, Constants.MAIN_PATH)
						.then(async (oData) => {
							const aResponseData = oData.results || [];
							if (!aResponseData.length) {
								const aMessages = [Message.createErrorMessage(this.oBundle.getText("Error013"))];
								return this._resetMessages(aMessages);
							}

							const aSortedData = [];
							const aMatchesMachineNo = [];

							// Sort by MachineNo
							for (const oItem of aResultData) {
								if (!aMatchesMachineNo.includes(oItem.MachineNo)) {
									for (const oResponse of aResponseData) {
										if (oResponse.outz_kidai_no === oItem.MachineNo) {
											oResponse.outsh_usr08 = oItem.AvailableShippingDate; // [搬入可能日]
											oResponse.outtline = oItem.Remarks; // [記事欄]

											const aResult = Validator._controlValidations(oResponse, "outsh_usr08", [
												{
													// Required check
													fnCheck: () => Validator.isRequired(oResponse.outsh_usr08),
													sMessage: this.oBundle.getText("Error016"),
												},
												{
													// Date string check
													fnCheck: () => Validator.isDateString(oResponse.outsh_usr08),
													sMessage: this.oBundle.getText("Error017"),
												},
											]);

											if (!aResult.length && oResponse.outsh_usr08) {
												// Fetch [搬入可能日] by [出荷可能日]
												try {
													await this._fetchDeliveryDate(oResponse);
												} catch (error) {
													console.error(error);
												}
											}
											aSortedData.push(oResponse);
										}
									}
									aMatchesMachineNo.push(oItem.MachineNo);
								}
							}
							oTable.sort();
							return Promise.resolve({ results: aSortedData });
						})
						.then(this._setResult.bind(this))
						.then(this._adjustTableContent.bind(this))
						.catch(this._resetMessages.bind(this))
						.finally(() => BusyIndicator.hide());
				}.bind(this);
				oFileReader.readAsArrayBuffer(oInputFile);
			},

			/**
			 * Handle live change select row
			 * @param {sap.ui.base.Event} oEvent
			 */
			onLiveChangeRowSeleted: function (oEvent) {
				const oControl = oEvent.getSource();
				const oTable = this._getTableControl();
				const aTableContext = this._getTableContextData(oTable);
				const oRowData = this._getTableRowContext(oControl);
				const iRowIndex = aTableContext.indexOf(oRowData);
				oTable.addSelectionInterval(iRowIndex, iRowIndex);
			},

			/**
			 * Handle change date
			 * @param {sap.ui.base.Event} oEvent
			 */
			onChangeDate: async function (oEvent) {
				const oControl = oEvent.getSource();
				const oRowData = this._getTableRowContext(oControl);

				const sId = oControl.getId();
				const bIsShipping = sId.includes("OUTSH_USR08"); // [出荷可能日]
				const bIsDelivery = sId.includes("OUTHA_USR08"); // [搬入可能日]

				if (bIsShipping) {
					// Check [出荷可能日]
					const aMessagesValidShippingDate = Validator._controlValidations(oRowData, "outsh_usr08", [
						{
							fnCheck: () => Validator.isRequired(oRowData.outsh_usr08),
							sMessage: this.oBundle.getText("Error016"), // Required
						},
						{
							fnCheck: () => Validator.isDateString(oRowData.outsh_usr08),
							sMessage: this.oBundle.getText("Error017"), // Format check
						},
					]);

					if (!aMessagesValidShippingDate.length && oRowData.outsh_usr08) {
						// Fetch [搬入可能日] by [出荷可能日]
						try {
							await this._fetchDeliveryDate(oRowData);
						} catch (error) {
							console.error(error);
						}
					}
				}

				if (bIsDelivery) {
					// Check [搬入可能日]
					if (oRowData.outha_usr08) {
						Validator._controlValidations(oRowData, "outha_usr08", [
							{
								fnCheck: () => Validator.isDateString(oRowData.outha_usr08),
								sMessage: this.oBundle.getText("Error017"), // Format check
							},
						]);
					}
				}

				this.onLiveChangeRowSeleted(oEvent);
				this._getTableModel().refresh();
			},

			/**
			 * Add +1 day to a date string (yyyy/MM/dd)
			 */
			_addOneDay: function (sDateStr) {
				const oDate = new Date(sDateStr);
				const oNextDay = new Date(oDate);
				oNextDay.setDate(oDate.getDate() + 1);

				const sYear = oNextDay.getFullYear();
				const sMonth = (oNextDay.getMonth() + 1).toString().padStart(2, "0");
				const sDay = oNextDay.getDate().toString().padStart(2, "0");
				return `${sYear}/${sMonth}/${sDay}`;
			},

			/**
			 * Fetch [搬入可能日] by [出荷可能日]
			 */
			_fetchDeliveryDate: function (oRowData) {
				BusyIndicator.show(0);

				return new Promise((resolve, reject) => {
					const oModel = this._getOdataModel();
					const sDateFormatted = oRowData.outsh_usr08.replaceAll("/", "");

					oModel.read(`/ShipDateSet(BULKUSR08='${sDateFormatted}')`, {
						success: function (oData) {
							oRowData.outha_usr08 = Formatter.onFormatDisplayDate(oData.BULKUSR08 || "");
							oRowData.outpa_ha_usr08 = Formatter.onFormatDisplayDate(oData.BULKUSR08 || "");

							Validator._controlValidations(oRowData, "outsh_usr08", [
								// [出荷可能日]
								{
									fnCheck: () => true,
									sMessage: "",
								},
							]);

							Validator._controlValidations(oRowData, "outha_usr08", [
								// [搬入可能日]
								{
									fnCheck: () => true,
									sMessage: "",
								},
							]);

							this._getTableModel() && this._getTableModel().refresh();
							BusyIndicator.hide();
							resolve(oData);
						}.bind(this),
						error: function (oError) {
							let sMessage = this.oBundle.getText("Error027");
							try {
								const oResponse = JSON.parse(oError.responseText);
								sMessage = oResponse.error?.message?.value || sMessage;
							} catch {
								sMessage = this.oBundle.getText("Error027");
							}

							Validator._controlValidations(oRowData, "outsh_usr08", [
								{
									fnCheck: () => false,
									sMessage: sMessage,
								},
							]);

							this._getTableModel() && this._getTableModel().refresh();
							BusyIndicator.hide();
							reject(oError);
						}.bind(this),
					});
				});
			},

			// *** HANDLE REGISTER *** //
			onPressSaveRemarksButton: Debounce(function () {
				const aMessages = [];
				const oTable = this._getTableControl();
				const aContextData = this._getTableContextData(oTable);
				const aSelectedIndices = oTable.getSelectedIndices();

				// Validate: no rows selected
				if (aSelectedIndices.length === 0) {
					aMessages.push(Message.createErrorMessage(this.oBundle.getText("Error015")));
					return this._resetMessages(aMessages);
				}

				const aSelectedItems = aContextData.filter((oItem, index) => aSelectedIndices.includes(index));

				this._getTableModel().refresh();
				if (aMessages.length) {
					return this._resetMessages(aMessages);
				} else {
					this._updateOData(aSelectedItems, "remarks")
						.then(this._outputSuccessMessages.bind(this))
						.catch(this._resetMessages.bind(this));
				}
			}, 500),

			onPressSaveButton: Debounce(function () {
				const aMessages = [];
				const oTable = this._getTableControl();
				const aContextData = this._getTableContextData(oTable);
				const aSelectedIndices = oTable.getSelectedIndices();

				// Validate: no rows selected
				if (aSelectedIndices.length === 0) {
					aMessages.push(Message.createErrorMessage(this.oBundle.getText("Error015")));
					return this._resetMessages(aMessages);
				}

				const aSelectedItems = aContextData.filter((oItem, index) => aSelectedIndices.includes(index));

				aSelectedItems.forEach((oItem) => {
					// Validate [出荷可能日]
					const sAdditionMessageShipping = `\n(No : ${oItem.index}  項目名 : 出荷可能日)`;
					const aValidateMessageShipping = Validator._controlValidations(oItem, "outsh_usr08", [
						{
							// Required check
							fnCheck: () => Validator.isRequired(oItem.outsh_usr08),
							sMessage: this.oBundle.getText("Error016") + sAdditionMessageShipping,
							sStateMessage: this.oBundle.getText("Error016"),
						},
						{
							// Date string check
							fnCheck: () => Validator.isDateString(oItem.outsh_usr08),
							sMessage: this.oBundle.getText("Error017") + sAdditionMessageShipping,
							sStateMessage: this.oBundle.getText("Error017"),
						},
					]);

					// Validate [搬入可能日]
					const sAdditionMessageDelivery = `\n(No : ${oItem.index}  項目名 : 搬入可能日)`;
					const aValidateMessageDelivery = Validator._controlValidations(oItem, "outha_usr08", [
						{
							// Date string check
							fnCheck: () => !oItem.outha_usr08 || Validator.isDateString(oItem.outha_usr08),
							sMessage: this.oBundle.getText("Error017") + sAdditionMessageDelivery,
							sStateMessage: this.oBundle.getText("Error017"),
						},
					]);

					const aValidateMessage = [...aValidateMessageShipping, ...aValidateMessageDelivery];

					aValidateMessage.forEach((sMessage) => {
						aMessages.push(Message.createErrorMessage(sMessage));
					});
				});
				this._getTableModel().refresh();

				if (aMessages.length) {
					return this._resetMessages(aMessages);
				} else {
					this._updateOData(aSelectedItems, "default")
						.then(this._outputSuccessMessages.bind(this))
						.catch(this._resetMessages.bind(this));
				}
			}, 500),

			/**
			 * Handle register data
			 */
			_updateOData: function (aUpdateData, sMode = "default") {
				// Filter items to register
				let aRegisterList = JSON.parse(JSON.stringify(aUpdateData));

				if (sMode === "default") {
					aRegisterList = aUpdateData.map((oItem) => {
						const oFormatted = {};
						Constants.TABLE_ITEMS_PROPERTIES.forEach((sProp) => {
							if (oItem[sProp] !== undefined) {
								oFormatted[sProp] = oItem[sProp];
							}
						});

						oFormatted.outno = oItem.index?.toString(); // [No]
						oFormatted.z_flag_check = "";

						Constants.TABLE_DATE_PROPERTIES.forEach((sProperty) => {
							if (oFormatted[sProperty]) {
								oFormatted[sProperty] = oFormatted[sProperty].replaceAll("/", "");
							}
						});

						return oFormatted;
					});
				} else if (sMode === "remarks") {
					aRegisterList = aUpdateData.map(({ outtline, outsh_vornr, outsh_objnr, outaufnr, index }) => {
						return {
							outno: index?.toString(), // [No]
							outtline, // [記事欄]
							outsh_vornr, // [活動（出荷）]
							outsh_objnr, // [対象番号（出荷）]
							outaufnr, // [指図番号]
							z_flag_check: "X",
						};
					});
				}

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

								// Disable the button that triggered this action on Internal Server Error (500) - No.2204
								if (aResMessage.some((oErr) => oErr.statusCode === "500")) {
									const sButtonId = sMode === "remarks" ? "SaveButtonRemarksOnly" : "SaveButton";
									this.byId(sButtonId).setEnabled(false);
								}

								fReject(aMessages);
							}.bind(this),
						};

						aRegisterList.forEach((oItem, index) => {
							oModel.create("/MachineInfoSet", oItem, {
								groupId: "group1",
								properties: oItem,
								changeSetId: index,
								...oParameters,
							});
						});

						// submit data
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
				const oErrorMessageColumn = this._getControlById("_IDGenColumn28"); // [エラーメッセージ]
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

					aFailItems.forEach((oFail) => {
						if (oItem.index?.toString() === oFail.outno) {
							oItem.outerror_message = oFail.outerror_message;
						}
					});
					aNewData.push(oItem);
				});

				this._setODataTable(aNewData);
				const bExistErrorMsg = aNewData.some((oItem) => !!oItem.outerror_message);
				oErrorMessageColumn.setVisible(bExistErrorMsg);

				// Show success messsage
				if (aFailItems.length === 0) {
					const oMessage = Message.createSuccessMessage(this.oBundle.getText("SuccessPopup"));
					MessageBox.show(oMessage.description, {
						icon: MessageBox.Icon.SUCCESS,
						...oMessage,
					});
				} else {
					// Show error messsage
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

			// *** HANDLE VIEW SETTING *** //
			/**
			 * Column settings button event handler
			 * Initialize p13nDialog model and its open
			 */
			onP13nDialogPress: function () {
				P13nDialog.onP13nDialogPress(Constants.PROGRAM_ID, this);
			},

			// *** HANDLE VARIANT MANAGEMENT *** //
			/**
			 * Handle bind value variant in the table
			 */
			_handleBindVariantAfterSearch: function () {
				const oView = this.getView();
				Variant.handleBindVariantAfterChange(oView);
			},

			/**
			 * Handle show the button save when resort, and save in the curent variant
			 */
			onDisplaySaveButton: async function () {
				const oView = this.getView();
				Variant.onDisplaySaveButton(oView);
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
