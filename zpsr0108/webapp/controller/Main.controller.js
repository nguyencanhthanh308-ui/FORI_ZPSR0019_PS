sap.ui.define(
	[
		"sap/base/util/UriParameters",
		"sap/ui/core/mvc/Controller",
		"sap/ui/core/BusyIndicator",
		"sap/ui/core/format/DateFormat",
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
	(
		UriParameters,
		Controller,
		BusyIndicator,
		DateFormat,
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
	) => {
		"use strict";

		return Controller.extend("zpsr0108.controller.Main", {
			onInit: async function () {
				// Initialize Data Model
				this._initDataModel();

				// Get all data for pull down and search help
				this._getDataInitialModel();

				// Initialize Data of 完成日(一括入力用)
				this._initCompletionDateRef();

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
				// Model for i18n
				this.oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
				// Screen model
				oView.setModel(models.createMainScreenModel(), "screen");
				// [プラント] model
				oView.setModel(models.createInitialModel(), "PlantModel");
				// [WC] model
				oView.setModel(models.createInitialModel(), "WCModel");

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
					this._readOData([], "F4PlantSet").then((oData) => {
						this._setModelByName(oData, "PlantModel");
					}),

					// [WC]
					this._readOData([], "F4WCSet").then((oData) => {
						this._setModelByName(oData, "WCModel");
					}),
				];

				Promise.all(promises)
					.then(() => BusyIndicator.hide())
					.catch(() => BusyIndicator.hide())
					.finally(() => BusyIndicator.hide());
			},

			/**
			 *  Initialize Data of 完成日(一括入力用)
			 */
			_initCompletionDateRef: function () {
				const oScreenModel = this._getScreenModel();

				// Get yesterday
				const oYesterday = new Date();
				oYesterday.setDate(oYesterday.getDate() - 1);

				// Format yyyy/MM/dd
				const sYesterday = DateFormat.getDateInstance({ pattern: "yyyy/MM/dd" }).format(oYesterday);
				oScreenModel.setProperty("/CompletionDate", sYesterday);
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

					// [未完]
					if (sName === "Incomplete") {
						jsonParseValue = jsonParseValue === "0" ? 0 : 1;
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

			/**
			 * Get current date format yyyyMMdd
			 */
			_getCurrenDate: function () {
				const oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
					pattern: "yyyyMMdd",
				});
				return oDateFormat.format(new Date());
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

			// *** HANDLE SEARCH BUTTON *** //
			/**
			 * Event handling when Search button pressed
			 */
			onPressSearchButton: Debounce(function () {
				//get filters from ScreenModel
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
					//clear all messages
					.then(this._clearMessages.bind(this))
					//when error occurs above, output messages
					.catch(this._resetMessages.bind(this));
			}, 0),

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
					aFilters.push(this._getFiltersFromTokenModel(oFilter.Plant, "werks"));
				}

				// Required validation: Plant - [プラント]
				const aPlantResults = Validator._controlValidations(oPlantControl, "", [
					{
						fnCheck: () => oFilter.Plant.length,
						sMessage: this.oBundle.getText("Error012"),
					},
				]);
				if (aPlantResults.length) {
					aMessages.push(Message.createErrorMessage(aPlantResults[0]));
				}

				// Assembly Month - 組立月
				if (oFilter.AssemblyMonth) {
					const aSplitDate = oFilter.AssemblyMonth.split(" - ");
					const sFirstDate = Formatter.dateInputFormatter(aSplitDate[0]?.replaceAll("/", ""), "yyyyMM");
					const sSecondDate =
						Formatter.dateInputFormatter(aSplitDate[1]?.replaceAll("/", ""), "yyyyMM") || null;

					if (!sSecondDate) {
						aFilters.push(new Filter("ntanf", FilterOperator.EQ, sFirstDate));
					} else {
						aFilters.push(new Filter("ntanf", FilterOperator.BT, sFirstDate, sSecondDate));
					}
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

				// WC - WC
				if (oFilter.WC.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.WC, "ktext"));
				}

				// Incomplete - 未完
				if (oFilter.Incomplete !== undefined) {
					aFilters.push(new Filter("userstatus", FilterOperator.EQ, oFilter.Incomplete === 0 ? "0" : "1"));
				}

				if (aMessages.length) {
					return Promise.reject(aMessages);
				} else {
					return Promise.resolve(aFilters);
				}
			},

			/**
			 * Clear all messages and pass through data for chaining - No.2204
			 */
			_removeAllMessages: function (aFilters) {
				sap.ui.getCore().getMessageManager().removeAllMessages();
				return aFilters;
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
					return Promise.reject([Message.createErrorMessage(this.oBundle.getText("Error014"))]);
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

					// Determine active item [完成日]
					oItem.bIsActiveCompletionDate = oItem.user_status_flag === "";
				});

				// Reset "Check All" state
				this._getScreenModel().setProperty("/bCheckAll", false);
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
				const oErrorMessageColumn = this._getControlById("_IDGenColumn11"); // [エラーメッセージ]
				let bExistErrorMessage = false;

				const aTableContext = this._getTableContextData(oTable);
				aTableContext.forEach((oItem, index) => {
					oItem.index = index + 1;
					if (oItem.error_msg) {
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
				(oScreenModel.setProperty("/AssemblyMonth", null), // [組立月]
					oScreenModel.setProperty("/WC", []), // [WC]
					oScreenModel.setProperty("/Plant", []), // [プラント]
					this._resetMessages([]));
			},

			// *** HANDLE VALUE HELP *** //
			onMultipleConditionsVHRequested: function (oEvent) {
				const oControl = oEvent.getSource();
				const sName = oControl.getName();
				// Init property for dialog
				let oColumns = {};
				const sTitle = this.oBundle.getText(`filter${sName}`);

				// Customer - 得意先
				if (sName === "WC") {
					oColumns = {
						WorkCenter: "arbpl",
						WorkCenterText: "ktext",
					};
				}

				// Init property for dialog
				const aFilters = [];
				ValueHelpDialog.onMultiValueHelpRequest.apply(this, [
					Constants.PROGRAM_ID,
					oControl,
					sTitle,
					oColumns,
					aFilters,
					[],
					["WC"],
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

			/**
			 * Show all item when use suggestion
			 */
			onSuggest: function (oEvent) {
				const aFilters = [];
				const oSource = oEvent.getSource();

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

				oBinding?.filter(aFilters);
				if (oLabel) {
					oLabel.setText(
						this.oBundle.getText(oLabel.getBindingInfo("text")?.binding.sPath) + ` (${oBinding.iLength})`
					);
				}
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
			 * Handle press reflection button
			 */
			onPressReflectionButton: function () {
				const sCurrentDate = this._getCurrenDate();
				const aMessages = [];
				const oTable = this._getTableControl();
				const oScreenModel = this._getScreenModel();
				const aTableContext = this._getTableContextData(oTable);
				const sCompletionDateReflection = oScreenModel.getProperty("/CompletionDate");
				const oCompletionDateControl = this._getControlById("OUTISDD_REF");
				const aSelectedRows = aTableContext.filter((oItem) => oItem.bSelected);

				// Validate: No rows selected
				if (!aSelectedRows.length) {
					aMessages.push(Message.createErrorMessage(this.oBundle.getText("Error015")));
					return this._resetMessages(aMessages);
				}

				// Validate: Date
				const aResult = Validator._controlValidations(oCompletionDateControl, "", [
					{
						fnCheck: () => !sCompletionDateReflection || Validator.isDateString(sCompletionDateReflection),
						sMessage: this.oBundle.getText("Error020"), // Format check
					},
					{
						fnCheck: () => sCurrentDate >= sCompletionDateReflection.replace(/[-/]/g, ""),
						sMessage: this.oBundle.getText("Error021"), // Future date check
					},
				]);

				if (aResult.length) {
					return;
				}

				aSelectedRows.forEach(async (oItem) => {
					// 完成日=［完成日(一括入力用)］
					oItem.isdd = sCompletionDateReflection;

					Validator._controlValidations(oItem, "isdd", [
						{
							// Required check
							fnCheck: () => Validator.isRequired(oItem.isdd),
							sMessage: this.oBundle.getText("Error014"),
						},
					]);
				});
				this._resetMessages([]);
				this._getTableModel().refresh();
			},

			/**
			 * Handle validation [完成日]
			 */
			onChangeCompletionDateReflection: function (oEvent) {
				const sCurrentDate = this._getCurrenDate();
				const oCompletionDateControl = oEvent.getSource();
				const sValue = oCompletionDateControl.getValue();

				Validator._controlValidations(oCompletionDateControl, "", [
					{
						fnCheck: () => !sValue || Validator.isDateString(sValue),
						sMessage: this.oBundle.getText("Error020"), // Format check
					},
					{
						fnCheck: () => sCurrentDate >= sValue.replace(/[-/]/g, ""),
						sMessage: this.oBundle.getText("Error021"), // Future date check
					},
				]);
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
				const aColumnLabels = ["No", "機台NO", "完成日"];
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
					fileName: `ZPSR0108_Format_Import`,
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
						const aMessages = [Message.createErrorMessage(this.oBundle.getText("Error013"))];
						return this._resetMessages(aMessages);
					}
				}
			},

			/**
			 * Handle show message on type miss match
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
						機台NO: "MachineNo",
						完成日: "CompletionDate",
					};

					// Read data from file
					Array.isArray(aExcelData) &&
						aExcelData.forEach((oExcelItem, index) => {
							const aInputKeys = Object.keys(oRegisterKeys);
							const aDateItems = ["完成日"];
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
						const aMessages = [Message.createErrorMessage(this.oBundle.getText("Error013"))];
						return this._resetMessages(aMessages);
					}

					const aMachineFilters = aResultData.map(
						(oItem) => new Filter("zwbselement", FilterOperator.EQ, oItem.MachineNo)
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
							const sCurrentDate = this._getCurrenDate();
							const aResponseData = oData.results || [];
							if (!aResponseData.length) {
								const aMessages = [Message.createErrorMessage(this.oBundle.getText("Error014"))];
								return this._resetMessages(aMessages);
							}

							const aSortedData = [];
							const aMatchesMachineNo = [];
							const aPromises = [];

							// Sort by MachineNo
							for (const oItem of aResultData) {
								if (!aMatchesMachineNo.includes(oItem.MachineNo)) {
									for (const oResponse of aResponseData) {
										if (oResponse.zwbselement === oItem.MachineNo) {
											oResponse.isdd = oItem.CompletionDate; // [完成日]

											Validator._controlValidations(oResponse, "isdd", [
												{
													// Required check
													fnCheck: () => Validator.isRequired(oResponse.isdd),
													sMessage: this.oBundle.getText("Error012"),
												},
												{
													// Date string check
													fnCheck: () => Validator.isDateString(oResponse.isdd),
													sMessage: this.oBundle.getText("Error020"),
												},
												{
													// Future date check
													fnCheck: () => sCurrentDate >= oResponse.isdd?.replace(/[-/]/g, ""),
													sMessage: this.oBundle.getText("Error021"),
												},
											]);

											aSortedData.push(oResponse);
										}
									}
									aMatchesMachineNo.push(oItem.MachineNo);
								}
							}

							await Promise.allSettled(aPromises);
							oTable.sort();
							return { results: aSortedData };
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
			 * Handle change date
			 * @param {sap.ui.base.Event} oEvent
			 */
			onChangeCompletionDate: async function (oEvent) {
				const sCurrentDate = this._getCurrenDate();
				const oControl = oEvent.getSource();
				const oRowData = this._getTableRowContext(oControl);
				// Auto checkbox ON
				oRowData.bSelected = true;
				this.onCheckBoxSelected();

				// Check [完成日]
				Validator._controlValidations(oRowData, "isdd", [
					{
						fnCheck: () => Validator.isRequired(oRowData.isdd),
						sMessage: this.oBundle.getText("Error012"), // Required
					},
					{
						fnCheck: () => Validator.isDateString(oRowData.isdd),
						sMessage: this.oBundle.getText("Error020"), // Format check
					},
					{
						fnCheck: () => sCurrentDate >= oRowData.isdd?.replace(/[-/]/g, ""),
						sMessage: this.oBundle.getText("Error021"), // Future date check
					},
				]);

				this._getTableModel().refresh();
			},

			// *** HANDLE EVENT OF CHECKBOX *** //
			/* Handle on toggle checkAll */
			onCheckAllToggle: function (oEvent) {
				const oTable = this._getTableControl();
				const oTableContext = this._getTableContextData(oTable);
				const bIsSelected = oEvent.getParameter("selected");
				oTableContext.forEach((oContextItem) => {
					if (bIsSelected && !oContextItem.bIsActiveCompletionDate) {
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

				const aActicveRows = aContextTable.filter((oItem) => oItem.bIsActiveCompletionDate);
				const bSelectAll = aActicveRows.length > 0 && aActicveRows.every((oItem) => oItem.bSelected);

				oScreenModel.setProperty("/bCheckAll", bSelectAll);
			},

			// *** HANDLE REGISTER *** //
			onPressSaveButton: Debounce(function () {
				const sCurrentDate = this._getCurrenDate();
				const aMessages = [];
				const oTable = this._getTableControl();
				const aContextData = this._getTableContextData(oTable);
				const aSelectedRows = aContextData.filter((oItem) => oItem.bSelected);

				// Validate: no rows selected
				if (aSelectedRows.length === 0) {
					aMessages.push(Message.createErrorMessage(this.oBundle.getText("Error015")));
					return this._resetMessages(aMessages);
				}

				aSelectedRows.forEach((oItem) => {
					// Validate [完成日]
					const sAddMessageCompletionDate = `\n(No : ${oItem.index}  項目名 : 完成日)`;
					const aValidateMessageCompletionDate = Validator._controlValidations(oItem, "isdd", [
						{
							// Required check
							fnCheck: () => Validator.isRequired(oItem.isdd),
							sMessage: this.oBundle.getText("Error012") + sAddMessageCompletionDate,
							sStateMessage: this.oBundle.getText("Error012"),
						},
						{
							// Date string check
							fnCheck: () => Validator.isDateString(oItem.isdd),
							sMessage: this.oBundle.getText("Error020") + sAddMessageCompletionDate,
							sStateMessage: this.oBundle.getText("Error020"),
						},
						{
							// Future date check
							fnCheck: () => sCurrentDate >= oItem.isdd?.replace(/[-/]/g, ""),
							sMessage: this.oBundle.getText("Error021") + sAddMessageCompletionDate,
							sStateMessage: this.oBundle.getText("Error021"),
						},
					]);

					aValidateMessageCompletionDate.forEach((sMessage) => {
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
				// Filter items to register
				let aRegisterList = JSON.parse(JSON.stringify(aUpdateData));

				aRegisterList = aUpdateData.map(({ aufnr, vornr, aufpl, aplzl, isdd, ntend, zwbselement, index }) => {
					const sIsdd = isdd ? isdd.replaceAll("/", "") : "";
					const sNtend = ntend ? ntend.replaceAll("/", "") : "";

					return {
						no: index?.toString(), // [No]
						aufnr, // [指図番号]
						vornr, // [活動（組立）]
						aufpl, // [作業計画番号]
						aplzl, // [カウンタ]
						isdd: sIsdd, // [完成日]
						ntend: sNtend, // [組立終了日]
						zwbselement, // [機台NO]
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
				const oErrorMessageColumn = this._getControlById("_IDGenColumn11"); // [エラーメッセージ]
				const aMessages = [];
				const aSuccessNo = aResponseData.filter((oItem) => !oItem.error_msg?.trim()).map((oItem) => oItem.no);
				const aFailItems = aResponseData.filter((oItem) => oItem.error_msg?.trim());

				// autoResizeColumn
				aTable.attachEventOnce("rowsUpdated", () => {
					const aColumns = aTable.getColumns().filter((oColumn) => oColumn.getVisible());
					const iColIndex = aColumns?.findIndex(
						(oColumn) => oColumn.getLabel()?.getText?.() === this.oBundle.getText("headerErrorMessage")
					);
					if (iColIndex !== -1) {
						aTable.autoResizeColumn(iColIndex);
					}
				});
				const aNewData = [];
				aTableContext.forEach((oItem) => {
					const sNo = oItem.index?.toString();

					// Remove the selected row when registration succeeds
					if (aSuccessNo.includes(sNo)) {
						return;
					}

					oItem.error_msg = "";

					aFailItems.forEach((oFail) => {
						if (sNo === oFail.no) {
							oItem.error_msg = oFail.error_msg;
						}
					});
					aNewData.push(oItem);
				});

				this._setODataTable(aNewData);
				const bExistErrorMsg = aNewData.some((oItem) => !!oItem.error_msg);
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
						this.oBundle.getText("Infor018", [aSuccessNo.length, aFailItems.length])
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
