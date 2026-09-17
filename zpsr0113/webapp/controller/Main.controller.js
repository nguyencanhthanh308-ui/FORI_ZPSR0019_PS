sap.ui.define(
	[
		"../handler/controlHandler/bookmark",
		"../handler/controlHandler/excel",
		"../handler/controlHandler/variant",
		"../handler/controlHandler/valueHelpDialog",
		"../handler/controlHandler/p13nDialogPopup",
		"../handler/debounce/debounce",
		"../handler/errorHandler/ErrorHandler",
		"../handler/formatter/formatter",
		"../handler/helper/Message",
		"../handler/helper/Validator",
		"../libs/Constant",
		"zpsr0113/model/models",
		"zpsr0113/libs/xlsx",
		"sap/base/util/UriParameters",
		"sap/m/MessageBox",
		"sap/ui/core/mvc/Controller",
		"sap/ui/core/BusyIndicator",
		"sap/ui/core/ValueState",
		"sap/ui/model/json/JSONModel",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
	],
	function (
		Bookmark,
		Excel,
		Variant,
		ValueHelpDialog,
		P13nDialogPopup,
		Debounce,
		ErrorHandler,
		Formatter,
		Message,
		Validator,
		Constant,
		models,
		XLSX,
		UriParameters,
		MessageBox,
		Controller,
		BusyIndicator,
		ValueState,
		JSONModel,
		Filter,
		FilterOperator
	) {
		"use strict";

		return Controller.extend("zpsr0113.controller.Main", {
			onInit: async function () {
				// Initialize Data Model
				this._initDataModel();

				// Get all data for drop down and search help
				this._getDataInitialModel();

				// Service variants
				await this._connectPersonalizationService();

				// Book mark
				Bookmark.initialBookmark.apply(this, [`/${Constant.MAIN_PATH}/$count`, ["filterbar1", "filterbar2"]]);

				// Transfer URL parameter to filter value
				this._handleSetValueParamToFilter();

				// Add event press for DateRangeSelection
				const oScheduledDeliDate = this.byId("INAFVV_0040_NTANF"); // [納入予定日]
				oScheduledDeliDate.addEventDelegate(
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
			 *  Initialize Data Model
			 */
			_initDataModel: function () {
				const oView = this.getView();
				// i18n model
				this.oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
				// Screen model
				oView.setModel(models.createMainScreenModel(), "screen");
				// [得意先] model
				oView.setModel(models.createInitialModel(), "oDataCustomer");
				// [納入先] model
				oView.setModel(models.createInitialModel(), "oDataDeliveryDestination");
				// [販売伝票タイプ] model
				oView.setModel(models.createInitialModel(), "oDataSalesDocumentType");
				// [営業所] model
				oView.setModel(models.createInitialModel(), "oDataSalesOffice");
				// [販売組織] model
				oView.setModel(models.createInitialModel(), "oDataSalesOrganization");
				// [営業グループ] model
				oView.setModel(models.createInitialModel(), "oDataSalesGroup");
			},

			/**
			 * Handle transfer URL parameter to filter value
			 * @returns
			 */
			_handleSetValueParamToFilter: function () {
				const aValues = [];
				const aFilterItem1 = this.getView().byId("filterbar1").getAllFilterItems();
				const aFilterItem2 = this.getView().byId("filterbar2").getAllFilterItems();
				const aFilterItems = [...aFilterItem1, ...aFilterItem2];
				const oFilter = this._getScreenModel();
				const sHash = window.location.hash;
				const sQuery = sHash.split("?")[1] || sHash;

				aFilterItems.forEach((oItem) => {
					const sName = oItem.getProperty("name");
					const sValue = UriParameters.fromQuery(sQuery).get(sName) || "";
					const aInputFilters = ["DirectiveNo", "OrderNumber"]; // [指令No.], [受注番号]
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

					if (typeof jsonParseValue === "number" && aInputFilters.includes(sName)) {
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

			/**
			 * Handle get all data for drop down and search help
			 */
			_getDataInitialModel: async function () {
				await this._getODataSearchHelp();
			},

			/**
			 * Get Table Controls
			 * @returns Table Control
			 */
			_getTableControl: function () {
				return this.getView().byId("tblMain");
			},

			/**
			 * Get view model by model name
			 * @returns {sap.ui.model.Model}
			 */
			_getTableModel: function () {
				return this.getView().getModel("oDataTable");
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
				const aDataLength = oBinding.oList.length;
				const aTableContext = oTable.getBinding("rows").getContexts(0, aDataLength);
				aTableContext.forEach((oTableContextItem) => {
					aData.push(oTableContextItem.getObject());
				});
				return aData;
			},

			/**
			 * Get screen model
			 */
			_getScreenModel: function () {
				return this.getView().getModel("screen");
			},

			/**
			 * Get control by id
			 * @param {String} sControlId
			 * @returns sapui5 Control
			 */
			_getControlById: function (sControlId) {
				return this.getView().byId(sControlId);
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
			 * Get data and set to search help model
			 */
			_getODataSearchHelp: function () {
				BusyIndicator.show(0);

				const promises = [
					// [得意先]
					this._readOData([], "ZPSCDS002").then((oData) => {
						this._setModelByName(oData, "oDataCustomer");
					}),

					// [納入先]
					this._readOData([], "ZPSCDS003").then((oData) => {
						this._setModelByName(oData, "oDataDeliveryDestination");
					}),

					// [販売伝票タイプ]
					this._readOData([], "ZPSCDS004").then((oData) => {
						this._setModelByName(oData, "oDataSalesDocumentType");
					}),

					// [営業所]
					this._readOData([], "ZPSCDS005").then((oData) => {
						this._setModelByName(oData, "oDataSalesOffice");
					}),

					// [販売組織]
					this._readOData([], "ZPSCDS006").then((oData) => {
						this._setModelByName(oData, "oDataSalesOrganization");
					}),

					// [営業グループ]
					this._readOData([], "ZPSCDS007").then((oData) => {
						this._setModelByName(oData, "oDataSalesGroup");
					}),
				];

				Promise.all(promises)
					.then(() => BusyIndicator.hide())
					.catch(() => BusyIndicator.hide());
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
				this.getView().setModel(new JSONModel(oData), "oDataTable");
			},

			// Event Handler

			// Handle multi sort
			_multiComparator: function (aData1, aData2, aRules) {
				for (const oRule of aRules) {
					const sValue1 = aData1[oRule.field] ?? "";
					const sValue2 = aData2[oRule.field] ?? "";

					let sResult;
					if (oRule.type === "number") {
						sResult = Number(sValue1) - Number(sValue2);
					} else {
						sResult = String(sValue1).localeCompare(String(sValue2));
					}

					if (sResult !== 0) {
						return oRule.order === "desc" ? -sResult : sResult;
					}
				}
				return 0;
			},

			/**
			 * Handle visibility [エラーメッセージ]
			 */
			_toggleErrorColumnVisibility: function () {
				const oTableControl = this._getTableControl();
				const aTableData = this._getTableContextData(oTableControl);
				const bHasMessage = aTableData.some((row) => row.OUTERROR_MESSAGE && row.OUTERROR_MESSAGE !== "");
				this._getControlById("_IDGenColumn28").setVisible(bHasMessage); // [エラーメッセージ]
			},

			/**
			 * Hanlde Visibility for bulk menu
			 */
			onToggleFormVisibility: function () {
				const oForm = this._getControlById("reflect_component");
				const oButton = this._getControlById("BulkBtn001");

				if (oForm.hasStyleClass("hidden-block")) {
					oForm.removeStyleClass("hidden-block");
					oButton.setText(this.oBundle.getText("btnCollpaseClose"));
				} else {
					oForm.addStyleClass("hidden-block");
					oButton.setText(this.oBundle.getText("btnCollpaseOpen"));
				}
			},

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
				const oSalesOrganizationControl = this._getControlById("INVKORG"); // [販売組織]

				const fnToggleValueState = function (oControl, bIsClear, sMessage) {
					if (bIsClear) {
						oControl.setValueState("None");
						oControl.setValueStateText("");
					} else {
						oControl.setValueState("Error");
						oControl.setValueStateText(sMessage);
					}
				};

				// FilterBar DirectiveNo [指令No.]
				if (oFilter.DirectiveNo) {
					aFilters.push(new Filter("INZSHIREINO", FilterOperator.EQ, oFilter.DirectiveNo));
				}

				// FilterBar Customer [得意先]
				if (oFilter.Customer.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.Customer, "INVBPA_AG_KUNNR"));
				}

				// FilterBar DeliveryDestination [納入先]
				if (oFilter.DeliveryDestination.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.DeliveryDestination, "INVBPA_WE_KUNNR"));
				}

				// FilterBar OrderNumber [受注番号]
				if (oFilter.OrderNumber) {
					aFilters.push(new Filter("INZVBELN", FilterOperator.EQ, oFilter.OrderNumber));
				}

				// FilterBar ProcessingCategory [処理区分]
				if (oFilter.ProcessingCategory !== undefined) {
					aFilters.push(
						new Filter("INZFLAG", FilterOperator.EQ, oFilter.ProcessingCategory === 0 ? "B1" : "B2")
					);
				}

				// FilterBar SalesDocumentType [販売伝票タイプ]
				if (oFilter.SalesDocumentType.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.SalesDocumentType, "INAUART"));
				}

				// FilterBar SalesOrganization [販売組織]
				if (oFilter.SalesOrganization.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.SalesOrganization, "INVKORG"));
				} else {
					aMessages.push(Message.createErrorMessage(this.oBundle.getText("ERROR011")));
				}

				// FilterBar SalesOffice [営業所]
				if (oFilter.SalesOffice.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.SalesOffice, "INVKBUR"));
				}

				// FilterBar SalesGroup [営業グループ]
				if (oFilter.SalesGroup.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.SalesGroup, "INVKGRP"));
				}

				// FilterBar ScheduledDeliveryDate [納入予定日]
				if (oFilter.ScheduledDeliveryDate) {
					const aSplitDate = oFilter.ScheduledDeliveryDate.split(" - ");
					const sFirstDate = aSplitDate[0]?.replaceAll("/", "");
					const sSecondDate = aSplitDate[1]?.replaceAll("/", "") || null;
					if (!sSecondDate) {
						aFilters.push(new Filter("INAFVV_0040_NTANF", FilterOperator.EQ, sFirstDate));
					} else {
						aFilters.push(new Filter("INAFVV_0040_NTANF", FilterOperator.BT, sFirstDate, sSecondDate));
					}
				}

				fnToggleValueState(
					oSalesOrganizationControl,
					oFilter.SalesOrganization.length,
					this.oBundle.getText("ERROR011")
				);

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
						return new Filter(sKey, FilterOperator.EQ, oTokenModel.key?.toString() || oTokenModel);
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
			_readOData: function (aFilters, sPath = Constant.MAIN_PATH) {
				const bShowBusyIndicator = sPath === Constant.MAIN_PATH || sPath === Constant.IMPORT_EXCEL_PATH;
				if (bShowBusyIndicator) {
					BusyIndicator.show(0);
				}
				// Reset register button after the main table reloads - No.2204
				if (sPath === Constant.MAIN_PATH) {
					this.byId("RegBtn001").setEnabled(true);
				}
				return new Promise(
					function (fResolve, fReject) {
						const oModel = this._getOdataModel();
						oModel.read(`/${sPath}`, {
							filters: aFilters,
							success: function (oData) {
								BusyIndicator.hide();
								fResolve(oData);
							}.bind(this),
							error: function (oResponse) {
								BusyIndicator.hide();
								const aMessages = ErrorHandler.getMessagesResponse(oResponse);
								if (bShowBusyIndicator) {
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
				// Check exist data
				const aDataResult = oData.results;
				if (aDataResult.length === 0) {
					this._setODataTable([]);
					return Promise.reject([Message.createErrorMessage(this.oBundle.getText("ERROR012"))]);
				}

				// Handle initial data
				this._handleInitODataTable(aDataResult);
				// Handle initial sort property for number items
				this._initialSortProperties(aDataResult);
				// Set retrieved data to table
				this._setODataTable(aDataResult);
				// Set visibility for error column
				this._toggleErrorColumnVisibility();
				return Promise.resolve();
			},

			/**
			 * Handle init data of table
			 * @param {Object[]} aDataTable
			 */
			_handleInitODataTable: function (aDataTable) {
				const aDateItems = Constant.TABLE_DATE_PROPERTIES;
				aDataTable.forEach((oItem, index) => {
					oItem.index = index + 1;
					oItem.OUTNO = oItem.OUTNO.trim();
					aDateItems.forEach((sDate) => {
						oItem[sDate] = Formatter.onFormatDisplayDate(oItem[sDate]);
					});
					oItem.OUTKBETR = Formatter.displayMoneyFormatter(oItem.OUTKBETR, oItem.OUTWAERK, true); // [受注金額]
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
				const aSortField = [...Constant.TABLE_AMOUNT_PROPERTIES, ...Constant.TABLE_NUMBER_PROPERTIES];
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
				return;
			},

			/**
			 * Handle bind value variant in the table
			 */
			_handleBindVariantAfterSearch: function () {
				const oView = this.getView();
				Variant.handleBindVariantAfterChange(oView);
			},

			/**
			 * Clear ScreenModel messages
			 */
			_clearMessages: function () {
				this._clearSelection();
				return this._resetMessages([]);
			},

			/**
			 * Clear selection on Table
			 */
			_clearSelection: function () {
				const oTable = this._getTableControl();
				oTable.clearSelection();
			},

			/**
			 * Output ScreenModel messages
			 */
			_resetMessages: function (aMessages) {
				BusyIndicator.hide();
				if (!aMessages || !Array.isArray(aMessages)) {
					return;
				}
				const bIsHasSuccessMessage = aMessages.some((oMessage) => oMessage.type === "Success");
				if (aMessages.length) {
					if (bIsHasSuccessMessage) {
						const oMessage = Message.createSuccessMessage(this.oBundle.getText("SuccessPopup"));
						MessageBox.show(oMessage.description, {
							icon: MessageBox.Icon.SUCCESS,
							...oMessage,
						});
					} else {
						const oMessage = Message.createErrorMessage(this.oBundle.getText("ErrorPopup"));
						MessageBox.show(oMessage.description, {
							icon: MessageBox.Icon.ERROR,
							...oMessage,
						});
					}
				}
				const oScreenModel = this._getScreenModel();

				// set messages to messagepopover control
				oScreenModel.setProperty("/Messages", aMessages);

				const iCount = aMessages.length;
				// set message button text, visibility
				oScreenModel.setProperty("/MessageCount", iCount);
				oScreenModel.setProperty("/HaveMessage", iCount !== 0);

				let sButtonType = "Default";
				let sButtonIcon = "sap-icon://message-success";

				if (bIsHasSuccessMessage) {
					sButtonType = "Success";
					sButtonIcon = "sap-icon://message-success";
				} else {
					sButtonType = "Negative";
					sButtonIcon = "sap-icon://message-error";
				}

				// set message button type, icon
				oScreenModel.setProperty("/MessageButtonType", sButtonType);
				oScreenModel.setProperty("/MessageButtonIcon", sButtonIcon);
				return Promise.resolve();
			},

			/**
			 * Event handling when message button pressed
			 */
			onPressMessageButton: function (oEvent) {
				const oMessagePopover = this.getView().byId("messageArea");
				oMessagePopover.toggle(oEvent.getSource());
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
				oScreenModel.setProperty("/DirectiveNo", ""); // [指令No.]
				oScreenModel.setProperty("/Customer", []); // [得意先]
				oScreenModel.setProperty("/DeliveryDestination", []); // [納入先]
				oScreenModel.setProperty("/OrderNumber", ""); // [受注番号]
				oScreenModel.setProperty("/SalesDocumentType", []); // [販売伝票タイプ]
				oScreenModel.setProperty("/SalesOrganization", []); // [販売組織]
				oScreenModel.setProperty("/SalesOffice", []); // [営業所]
				oScreenModel.setProperty("/SalesGroup", []); // [営業グループ]
				oScreenModel.setProperty("/ScheduledDeliveryDate", ""); // [納入予定日]
				this._resetMessages([]);
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
			onSuggestValueHelp: function (oEvent) {
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

				oBinding?.filter([oFilterByName]);
				if (oLabel) {
					oLabel.setText(
						this.oBundle.getText(oLabel.getBindingInfo("text")?.binding.sPath) + ` (${oBinding.iLength})`
					);
				}
			},

			/**
			 * Obtain filters for value help and suggestion
			 */
			_getValueHelpFilterByName: function (sName) {
				const aFilters = [];
				const oScreenModel = this._getScreenModel();
				// Customer - [得意先]
				if (sName === "Customer") {
					const aSalesOrganization = oScreenModel.getProperty("/SalesOrganization");
					if (aSalesOrganization.length) {
						const oFilterCustomer = this._getFiltersFromTokenModel(aSalesOrganization, "SalesOrganization"); // [販売組織]
						aFilters.push(oFilterCustomer);
					}
				}

				// Delivery Destination - [納入先]
				if (sName === "DeliveryDestination") {
					const aSalesOrganization = oScreenModel.getProperty("/SalesOrganization");
					if (aSalesOrganization.length) {
						const oFilterCustomer = this._getFiltersFromTokenModel(aSalesOrganization, "SalesOrganization"); // [販売組織]
						aFilters.push(oFilterCustomer);
					}
				}

				// Sales Office - [営業所]
				if (sName === "SalesOffice") {
					const aSalesOrganization = oScreenModel.getProperty("/SalesOrganization");
					if (aSalesOrganization.length) {
						const oFilterCustomer = this._getFiltersFromTokenModel(aSalesOrganization, "vkorg"); // [販売組織]
						aFilters.push(oFilterCustomer);
					}
				}

				// Sales Group - [営業グループ]
				if (sName === "SalesGroup") {
					const aSalesOfficeData = this._getModelByName("oDataSalesOffice")?.getData();
					const aSalesOrganization = oScreenModel.getProperty("/SalesOrganization");

					const aSalesOfficeBySalesOrg = aSalesOfficeData.reduce((aAccumulator, oItem) => {
						if (aSalesOrganization.includes(oItem.vkorg)) {
							aAccumulator.push(oItem.vkbur);
						}
						return aAccumulator;
					}, []);

					if (aSalesOfficeBySalesOrg.length) {
						const oFiltersBySalesOrg = this._getFiltersFromTokenModel(aSalesOfficeBySalesOrg, "vkbur");
						aFilters.push(oFiltersBySalesOrg);
					}

					const aSalesOffice = oScreenModel.getProperty("/SalesOffice");
					if (aSalesOffice.length) {
						const oCurrentFilters = this._getFiltersFromTokenModel(aSalesOffice, "vkbur");
						aFilters.push(oCurrentFilters);
					}
				}
				return aFilters;
			},

			/**
			 * Handle Open Multi Value Help Request
			 * @param {*} oEvent
			 */
			onMultipleConditionsVHRequested: function (oEvent) {
				const oControl = oEvent.getSource();
				const sName = oControl.getName();

				let oColumns = {};
				const sTitle = this.oBundle.getText(`filter${sName}`);

				// Customer - [得意先]
				if (sName === "Customer") {
					oColumns = {
						SalesOrganization: "SalesOrganization", // [販売組織]
						CustomerCode: "Customer", // [得意先コード]
						CustomerName: "Name1", // [得意先名称]
						Name2: "Name2",
					};
				}

				// Delivery Destination - [納入先]
				if (sName === "DeliveryDestination") {
					oColumns = {
						SalesOrganization: "SalesOrganization", // [販売組織]
						CustomerCode: "Customer", // [得意先コード]
						DeliveryDestinationName: "Name1", // [納入先名称]
						Name2: "Name2",
					};
				}

				// Sales Office - [営業所]
				if (sName === "SalesOffice") {
					oColumns = {
						SalesOrganization: "vkorg", // [販売組織]
						DistributionChannel: "vtweg", // [流通チャネル]
						Division: "spart", // [製品部門]
						SalesOffice: "vkbur", // [営業所]
						Description: "bezei", // [内容説明]
					};
				}

				// Sales Group - [営業グループ]
				if (sName === "SalesGroup") {
					oColumns = {
						SalesOffice: "vkbur", // [営業所]
						SalesGroup: "vkgrp", // [営業グループ]
						Description: "bezei", // [内容説明]
					};
				}

				// Init property for dialog
				const aFilters = this._getValueHelpFilterByName(sName);
				// Open value help dialog
				ValueHelpDialog.onMultiValueHelpRequest.apply(this, [
					Constant.PROGRAM_ID,
					oControl,
					sTitle,
					oColumns,
					aFilters,
				]);
			},

			/**
			 * Format Shipping Date in table
			 */
			onFormatDate: function (sDateInput) {
				return Formatter.FormatStringToDate(sDateInput);
			},

			/**
			 * Handle onChange Shipping Date in Bulk
			 */
			onChangeFieldForm: function (oEvent) {
				const oSource = oEvent.getSource();
				const bValid = oEvent.getParameter("valid");

				oSource.setValueState(bValid ? "None" : "Error");
				oSource.setValueStateText(bValid ? "" : this.oBundle.getText("ERROR020"));
			},

			/**
			 * Handle set visible input for column [出荷日]
			 */
			isVisibleByFlag: function (sFlag, oParams) {
				return sFlag === oParams;
			},

			/**
			 * Handle Reflection Data
			 */
			onPressReflection: function () {
				const oTable = this._getTableControl();
				const aContextData = this._getTableContextData(oTable);
				const aSelectedIndices = oTable.getSelectedIndices();
				const oScreenModel = this._getScreenModel().getData();
				const oBulkShipDateControl = this._getControlById("BULKZACTDELDATE"); // 出荷日(一括入力用)
				const sBulkShippingDate = oScreenModel.bulkShippingDate;

				// Raise message if no row check is on
				if (aSelectedIndices.length === 0) {
					this._resetMessages([Message.createErrorMessage(this.oBundle.getText("ERROR013"))]);
					return;
				}

				// Handle not excute when Date is invalid
				const bValidDate = Validator.isDateString(sBulkShippingDate);
				if (!bValidDate && sBulkShippingDate !== "") {
					return;
				}

				// Relection Data
				aSelectedIndices.forEach((item) => {
					const oRow = aContextData[item];
					if (oRow.OUTZFLAG === "B1") {
						// [処理区分] = "B1"
						oRow.OUTZACTDELDATE = oScreenModel.bulkShippingDate; // [出荷日]
					}
					// reset Value State
					this._setValueState(oRow, "ShippingDate", ValueState.None, "");
				});

				oBulkShipDateControl.setValueState("None");
				oBulkShipDateControl.setValueStateText("");
				this._getTableModel().refresh();
				this._resetMessages();
			},

			/**
			 * Handle on press download standard button
			 */
			onPressDownloadButton: function () {
				const oTable = this._getTableControl();
				const aDataSource = this._getTableContextData(oTable);

				const oSpecialItems = {
					aNumberItems: Constant.TABLE_NUMBER_LABELS,
					aAmountItems: Constant.TABLE_AMOUNT_LABELS,
					aDateItems: Constant.TABLE_DATE_LABELS,
				};
				const aCols = Excel.createColumnConfig(oTable, oSpecialItems);

				const oFormatItems = {
					aNumberItems: Constant.TABLE_NUMBER_PROPERTIES,
					aAmountItems: Constant.TABLE_AMOUNT_PROPERTIES,
					aDateItems: Constant.TABLE_DATE_PROPERTIES,
				};
				Excel.handleDownloadExcel(aDataSource, aCols, oFormatItems, Constant.PROGRAM_ID);
			},

			/**
			 * Handle download formal file
			 */
			onPressDownloadFormatExcel: function () {
				this._clearMessages();
				const aHeader = ["No", "機台NO", "出荷日"];

				// Create worksheet
				const aColumnWidths = [
					{ wch: 8 }, // No
					{ wch: 18 }, // 出荷日
					{ wch: 20 }, // 機台NO
				];
				const oWorksheet = XLSX.utils.aoa_to_sheet([aHeader]);
				oWorksheet["!cols"] = aColumnWidths;

				// Gray background + border
				const oHeaderStyle = {
					fill: { fgColor: { rgb: "E9E9E9" } },
					border: ["top", "right", "bottom", "left"].reduce((acc, side) => {
						acc[side] = { style: "thin", color: { rgb: "000000" } };
						return acc;
					}, {}),
				};

				// Apply gray style to header
				const oSheetRange = XLSX.utils.decode_range(oWorksheet["!ref"]);
				for (let iCol = oSheetRange.s.c; iCol <= oSheetRange.e.c; iCol++) {
					const sCellAddress = XLSX.utils.encode_cell({ r: 0, c: iCol });

					if (oWorksheet[sCellAddress]) {
						oWorksheet[sCellAddress].s = oHeaderStyle;
					}
				}

				// Handle downdload format file
				const oWorkbook = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(oWorkbook, oWorksheet, this.oBundle.getText("appTitle"));

				const sUpperProgramID = Constant.PROGRAM_ID.toUpperCase();
				XLSX.writeFile(oWorkbook, `${sUpperProgramID}_Format_Import.xlsx`, {
					compression: true,
				});
			},

			/**
			 * Handle press on format import button - TODO
			 */
			onPressImportFile: function (oEvent) {
				this._clearMessages();
				// this._resetDataModel();

				const aAcceptFileType = [
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
					"application/vnd.ms-excel",
				];
				const aMessages = [];
				const aFiles = oEvent.getParameter("files");

				if (aFiles && aFiles.length > 0) {
					let oFile = null;
					oFile = aFiles[0];

					if (aAcceptFileType.includes(oFile.type)) {
						this._handleExtractFile(oFile);
					} else {
						aMessages.push(Message.createErrorMessage(this.oBundle.getText("ERROR014")));
						this._resetMessages(aMessages);
					}
				}
			},

			/* Handle reset data when update new file */
			_resetDataModel: function () {
				const oModel = this._getTableModel();
				const aEmptyData = [];
				oModel.setData(aEmptyData);
				oModel.refresh();
			},

			/**
			 * Extract data from input file
			 * @param {File} oInputFile
			 */
			_handleExtractFile: function (oInputFile) {
				const aResultData = [];
				const aFilters = [];
				const oFileReader = new FileReader();
				oFileReader.onload = async (oEvent) => {
					let bHasError = false;
					const aMessages = [];
					const aMachineNoFilter = [];
					const binaryData = oEvent.target.result;
					const workbook = XLSX.read(binaryData, {
						type: "binary",
						raw: false,
						dateNF: "yyyy/MM/dd",
					});
					let aExcelData;

					workbook.SheetNames.forEach((sheetName) => {
						aExcelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName], { raw: false });
					});
					if (!aExcelData.length) {
						aMessages.push(Message.createErrorMessage(this.oBundle.getText("ERROR014")));
						this._resetMessages(aMessages);
						return;
					}

					aExcelData = this._removeWhitespaceFromKeys(aExcelData);
					aExcelData.map((oExcelRow) => {
						if (!oExcelRow["機台NO"]) {
							bHasError = true;
						} else {
							aMachineNoFilter.push(new Filter("OUTPOSID", FilterOperator.EQ, oExcelRow["機台NO"]));
						}

						aResultData.push({
							OUTNO: oExcelRow["No"],
							OUTZACTDELDATE: oExcelRow["出荷日"],
							OUTPOSID: oExcelRow["機台NO"],
						});
					});
					if (bHasError) {
						aMessages.push(Message.createErrorMessage(this.oBundle.getText("ERROR014")));
						this._resetMessages(aMessages);
						return;
					}

					aFilters.push(
						new Filter("OUTZFLAG", FilterOperator.EQ, "B1"), // [処理区分]
						aMachineNoFilter?.length ? new Filter({ filters: aMachineNoFilter, and: false }) : null
					);

					// Handle search after import excel file
					this._readOData(aFilters, Constant.IMPORT_EXCEL_PATH)
						// set retrieved data to ScreenModel
						.then(this._setResult.bind(this))
						// handle value before display
						.then(() => this._handleDataBeforeOutput(aResultData))
						// clear all messages
						.then(this._clearMessages.bind(this))
						// when error occurs above, output messages
						.catch(this._resetMessages.bind(this));
				};

				oFileReader.readAsBinaryString(oInputFile);
			},

			/**
			 * Remove white space from keys
			 * @returns
			 */
			_removeWhitespaceFromKeys: function (aInputData) {
				return aInputData.map((oRow) => {
					const oCleanRow = {};

					Object.keys(oRow).forEach((sKey) => {
						oCleanRow[sKey.trim()] = oRow[sKey];
					});

					return oCleanRow;
				});
			},

			/**
			 * Handle format data before output
			 */
			_handleDataBeforeOutput: function (aExcelData) {
				const oTableControl = this._getTableControl();
				const aTableContext = this._getTableContextData(oTableControl);
				let iCountIndex = 0;

				// Build index from Excel
				const aExcelImportedIndex = {};
				aExcelData.forEach((oItem, iIndex) => {
					aExcelImportedIndex[oItem.OUTPOSID] = {
						index: iIndex,
						date: oItem.OUTZACTDELDATE, // [出荷日]
					};
				});

				// Sort date
				const aSortedTable = aTableContext
					.filter((oItem) => aExcelImportedIndex[oItem.OUTPOSID]) // [WBS要素（機台NO）]
					.map((oItem) => {
						const { date } = aExcelImportedIndex[oItem.OUTPOSID];
						const sErrorMessage = this._checkInvalidateDate(date, oItem.OUTUSR08); // [出荷可能日]
						iCountIndex += 1;
						return {
							...oItem,
							OUTNO: iCountIndex.toString(), // [No]
							OUTZACTDELDATE: date, // [出荷日]
							OUTZFLAG: "B1", // [処理区分]
							valueStateShippingDate: sErrorMessage ? "Error" : "None",
							valueStateShippingDateText: sErrorMessage ? this.oBundle.getText(sErrorMessage) : "",
						};
					})
					.sort(
						(oFirstItem, oSecondItem) =>
							aExcelImportedIndex[oFirstItem.OUTPOSID].index -
							aExcelImportedIndex[oSecondItem.OUTPOSID].index
					);
				this._setODataTable(aSortedTable);
				// Set back to model
				this._getTableModel().refresh();
				return Promise.resolve();
			},

			/**
			 * Handle on change event for [出荷日]
			 */
			onChangeSelectAndDatePicker: function (oEvent) {
				const oSource = oEvent.getSource();
				const sValue = oSource.getValue();
				const oContext = oSource.getBindingContext("oDataTable");
				const sAvailableDate = oContext.getProperty("OUTUSR08"); // [出荷可能日]

				const sErrorMessage = this._checkInvalidateDate(sValue, sAvailableDate);
				if (sErrorMessage !== "") {
					oSource.setValueState("Error");
					oSource.setValueStateText(this.oBundle.getText(sErrorMessage));
					return;
				}

				oSource.setValueState("None");
				oSource.setValueStateText(this.oBundle.getText(""));
				this.onAutoCheckBox(oEvent);
			},

			/**
			 * Handle selected check box when value change
			 */
			onAutoCheckBox: function (oEvent) {
				// Get the absolute row index in the binding
				const oBindingContext = oEvent.getSource().getBindingContext("oDataTable");
				const sPath = oBindingContext.getPath(); // e.g. "/results/3"
				const iModelIndex = parseInt(sPath.split("/").pop(), 10);

				// Convert to visible row index (after sorting/filtering)
				const oTable = this._getTableControl();
				const iVisibleIndex = oTable.getBinding("rows").aIndices.indexOf(iModelIndex);
				iVisibleIndex >= 0 && oTable.addSelectionInterval(iVisibleIndex, iVisibleIndex);
			},

			/**
			 * Handle connect to the Personalization service when start app
			 */
			_connectPersonalizationService: async function () {
				const oView = this.getView();
				const sIdVariant = UriParameters.fromQuery(window.location.search).get("variant-id");
				await Variant.connectPersonalizationService(oView, Constant.PROGRAM_ID, sIdVariant);
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
				P13nDialogPopup.onP13nDialogPress(Constant.PROGRAM_ID, this);
			},

			/**
			 * Handle when select row
			 * 	- Auto-set Shipping Date [出荷日] based on Processing Type
			 *	- B1: If Shipping Date is blank, set to system date
			 *	- B2: Disable Shipping Date input
			 */
			onRowSelectionChange: function (oEvent) {
				const oSource = oEvent.getSource();
				const iRowIndex = oEvent.getParameter("rowIndex");
				const bSelectAll = oEvent.getParameter("selectAll");
				const oTableControl = this._getTableControl();
				const aTableContext = this._getTableContextData(oTableControl);
				const oRow = aTableContext[iRowIndex];
				const bSelected = oSource.isIndexSelected(iRowIndex);
				const sCurrentDate = Formatter.getCurrentDate();

				// Handle set value for [出荷日]
				if (bSelectAll) {
					aTableContext.forEach((oRow) => {
						if (!oRow.OUTZACTDELDATE && oRow.OUTZFLAG === "B1") {
							oRow.OUTZACTDELDATE = sCurrentDate;
						}
					});
				} else if (bSelected && !oRow.OUTZACTDELDATE && oRow.OUTZFLAG === "B1") {
					oRow.OUTZACTDELDATE = sCurrentDate;
				}
				this._getTableModel().refresh();
			},

			/**
			 * Handle event when clicked register button
			 */
			onPressRegisterButton: Debounce(function () {
				// Check data before sending
				this._checkData()
					// Send data to backend
					.then(this._updateOData.bind(this))
					// Handle success output
					.then(this._outputSuccessMessages.bind(this))
					// Handle and reset errors if fails
					.catch(this._resetMessages.bind(this));
			}, 500),

			/**
			 * Handle data before sending
			 */
			_checkData: function () {
				const aMessages = [];
				const oTable = this._getTableControl();
				const aContextData = this._getTableContextData(oTable);
				const aSelectedIndices = oTable.getSelectedIndices();
				const oFilter = this._getScreenModel().getData();
				const aRequiredFields = ["OUTZACTDELDATE"]; // [出荷日]
				const aDataFields = [
					"OUTNO", // No
					"OUTZACTDELDATE", // [出荷日]
					"OUTZPLANDELDATE", // [出荷指示日]
					"OUTZPLANDELNUM", // [出荷指示数量]
					"OUTZSHIREINO", // [指令No.]
					"OUTZGOKINO", // [号機]
					"OUTAUART", // [販売伝票タイプ]
					"OUTVKORG", // [販売組織]
					"OUTVTEXT", // [販売組織名称]
					"OUTVKBUR", // [営業所]
					"OUTTVKBT_BEZEI", // [営業所名称]
					"OUTVKGRP", // [営業グループ]
					"OUTTVGRT_BEZEI", // [営業グループ名称]
					"OUTZVBELN", // [受注番号]
					"OUTZPOSNR", // [明細番号]
					"OUTMATNR", // [営業品目番号]
					"OUTZ_EIGYOU_KISHU", // [営業機種]
					"OUTWAERK", // [通貨]
					"OUTKBETR", // [受注金額]
					"OUTVBPA_AG_KUNNR", // [得意先]
					"OUTKNA1_AG_NAME", // [得意先名称]
					"OUTVBPA_WE_KUNNR", // [納入先]
					"OUTKNA1_WE_NAME", // [納入先名称]
					"OUTUSR08", // [出荷可能日]
					"OUTAFVV_0020_NTANF", // [出荷予定日]
					"OUTAFVV_0040_NTANF", // [納入予定日]
					"OUTERROR_MESSAGE", // [エラーメッセージ]
					"OUTPOSID", // [WBS要素（機台NO）]
					"OUTZFLAG", // [処理区分]
					"INZFLAG", // [処理区分]
				];

				// Get selected records
				const aSelectedRecords = aContextData.filter((oItem, index) => aSelectedIndices.includes(index));

				// No selection
				if (aSelectedRecords.length === 0) {
					aMessages.push(Message.createErrorMessage(this.oBundle.getText("ERROR017")));
					return Promise.reject(aMessages);
				}

				// Validate required fields
				let bValid = true;
				for (const oRow of aSelectedRecords) {
					if (!oRow) continue;
					for (const sField of aRequiredFields) {
						if (oRow["OUTZFLAG"] === "B2") continue; // [処理区分]
						if (!this._cellCheck(oRow, sField, aMessages)) {
							bValid = false;
						}
					}
				}

				const aUpdateList = aSelectedRecords.map((oRecord) =>
					Object.fromEntries(aDataFields.map((sField) => [sField, oRecord[sField]]))
				);

				const aFinalList = aUpdateList.map((oItem) => {
					const oNewOdata = {};
					aDataFields.forEach((sField) => {
						let sValue = oItem[sField];

						// [処理区分]
						if (sField === "INZFLAG") {
							sValue = oFilter.ProcessingCategory === 0 ? "B1" : "B2";
						}

						if (Constant.TABLE_DATE_PROPERTIES.includes(sField) && typeof sValue === "string") {
							sValue = sValue.replaceAll("/", "").trim();
						}
						oNewOdata[sField] = sValue;
					});
					return oNewOdata;
				});

				if (!bValid) {
					return Promise.reject(aMessages);
				}

				return Promise.resolve({ result: aFinalList });
			},

			/**
			 * Handle check field is require
			 * @param {*} oRow
			 * @param {*} sField
			 * @returns bResult
			 */
			_cellCheck: function (oRow, sField, aMessages) {
				const sValue = oRow[sField];
				const sRowNo = oRow["OUTNO"] || ""; // No
				const sRowAvailableDateValue = oRow["OUTUSR08"]; // [出荷可能日]
				const [sFieldLabel, sFieldName] = Constant.REQUIRED_COLUMNS[sField];
				let bHasError = true;

				// Required field check
				if (!sValue) {
					this._setValueState(oRow, sFieldName, ValueState.Error, this.oBundle.getText("ERROR019"));

					aMessages.push(
						Message.createErrorMessage(
							`${this.oBundle.getText("ERROR021")}
							${this.oBundle.getText("ErrNo", sRowNo)}`
						)
					);
					return false;
				}

				// Date validation [出荷日]
				if (sField === "OUTZACTDELDATE") {
					const sErrorMessage = this._checkInvalidateDate(sValue, sRowAvailableDateValue);
					if (sErrorMessage) {
						if (sErrorMessage === "ERROR020") {
							aMessages.push(
								Message.createErrorMessage(
									`${this.oBundle.getText(sErrorMessage)} 
									${this.oBundle.getText("ErroNoAndName", [sRowNo, sFieldLabel])}`
								)
							);
						} else {
							aMessages.push(
								Message.createErrorMessage(
									`${this.oBundle.getText(sErrorMessage)} 
									${this.oBundle.getText("ErrNo", sRowNo)}`
								)
							);
						}
						this._setValueState(oRow, sFieldName, ValueState.Error, sErrorMessage);
						bHasError = false;
					} else {
						this._setValueState(oRow, sFieldName, ValueState.None, "");
					}
				}
				this._getTableModel().refresh();
				return bHasError;
			},

			/**
			 * Handle check valid date for column
			 */
			_checkInvalidateDate: function (sValue, sAvailableDateValue) {
				const oRegex = /^\d{4}\/\d{2}\/\d{1,2}$/;

				// Error when value is empty
				if (!sValue) {
					return "ERROR019";
				}

				// Error when date is invalid
				if (!oRegex.test(sValue)) {
					return "ERROR020";
				} else {
					const [year, month, day] = sValue.split("/").map(Number);
					const oDate = new Date(year, month - 1, day);
					if (oDate.getFullYear() !== year || oDate.getMonth() + 1 !== month || oDate.getDate() !== day) {
						return "ERROR020";
					}
				}

				// Handle Date > current date
				const oInputDate = new Date(sValue);
				const oCurrentDate = new Date();
				oInputDate.setHours(0, 0, 0, 0);
				oCurrentDate.setHours(0, 0, 0, 0);
				if (oInputDate > oCurrentDate) {
					return "ERROR022";
				}

				// Handle Date < Available date
				if (sAvailableDateValue) {
					const oAvailableDate = new Date(sAvailableDateValue);
					oAvailableDate.setHours(0, 0, 0, 0);
					if (oInputDate < oAvailableDate) {
						return "ERROR023";
					}
				}

				// Handle Date < 36 month
				const oThreeYearsAgoDate = new Date();
				oThreeYearsAgoDate.setMonth(oThreeYearsAgoDate.getMonth() - 36);
				if (oInputDate < oThreeYearsAgoDate) {
					return "ERROR024";
				}

				return "";
			},

			/**
			 * Handle value state for column
			 */
			_setValueState: function (oRow, sField, sState, sMessageKey) {
				oRow[`valueState${sField}`] = sState;
				oRow[`valueState${sField}Text`] = sMessageKey ? this.oBundle.getText(sMessageKey) : "";
			},

			/**
			 * Handle Update DB - TODO
			 */
			_updateOData: function (aRegisterList) {
				BusyIndicator.show(0);
				return new Promise(
					function (fResolve, fReject) {
						const aResultData = [];
						// Initial update list
						const aUpdateList = aRegisterList.result;
						let iLenData = aUpdateList.length;
						let sSuccessCount = 0;
						let sFailCount = 0;

						// Config batch processing
						const oModel = this._getOdataModel();
						oModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
						oModel.setUseBatch(true);
						oModel.setDeferredGroups(["group1"]);

						// Initial params update
						const oParameters = {
							groupId: "group1",
							success: function (oData, oResponse) {
								BusyIndicator.hide();
								// Get success msg from backend
								const sSapMessage = oResponse.headers["sap-message"];
								let oSapMessage;
								if (sSapMessage) {
									oSapMessage = JSON.parse(sSapMessage);
								}

								// Count success and fail
								if (oSapMessage?.message) {
									const sMessage = oSapMessage.message;
									const iSuccessCount = Number(sMessage.match(/正常：(\d+)件/)?.[1] || 0);
									const iErrorCount = Number(sMessage.match(/エラー：(\d+)件/)?.[1] || 0);
									sSuccessCount += iSuccessCount;
									sFailCount += iErrorCount;
								}

								aResultData.push(oData);
								--iLenData;
								if (iLenData === 0) {
									fResolve({
										resultData: aResultData,
										successCount: sSuccessCount,
										failCount: sFailCount,
									});
								}
							}.bind(this),

							error: function (oResponse) {
								BusyIndicator.hide();
								const aMessages = ErrorHandler.getMessagesResponse(oResponse);

								// Disable register button on Internal Server Error (500) - No.2204
								if (aMessages.some((oErr) => oErr.statusCode === "500")) {
									this.byId("RegBtn001").setEnabled(false);
								}

								fReject(aMessages);
							}.bind(this),
						};

						aUpdateList.forEach((aUpdateItem, iIndex) => {
							oModel.create(`/${Constant.UPDATE_PATH}`, aUpdateItem, {
								...oParameters,
								changeSetId: `changeset${iIndex}`,
							});
						});

						// start batch processing
						oModel.submitChanges({
							groupId: "group1",
						});
					}.bind(this)
				);
			},

			/**
			 * Get messages response from ABAP
			 */
			_getMessageResponse: function (res) {
				try {
					const oRes = JSON.parse(res.responseText);
					return oRes.error.message.value;
				} catch {
					const jsonRes = this._parseXmlToJson(res.responseText);
					return jsonRes.error.message;
				}
			},

			/**
			 * Handle parse xml response to json
			 */
			_parseXmlToJson: function (xml) {
				const json = {};
				const iEndTag = xml.indexOf(">") + 1;
				const sRemoveXmlType = xml.substring(iEndTag);

				for (const res of sRemoveXmlType.matchAll(
					/(?:<(\w*)(?:\s[^>]*)*>)((?:(?!<\1).)*)(?:<\/\1>)|<(\w*)(?:\s*)*\/>/gm
				)) {
					const key = res[1] || res[3];
					const value = res[2] && this._parseXmlToJson(res[2]);
					json[key] = (value && Object.keys(value).length ? value : res[2]) || null;
				}

				return json;
			},

			/**
			 * Output register success messages - TODO
			 */
			_outputSuccessMessages: function ({ resultData, successCount, failCount }) {
				const aParsedData = Array.isArray(resultData) ? resultData : [resultData];
				const oTableControl = this._getTableControl();
				const aTableContext = this._getTableContextData(oTableControl);
				const sSuccessCount = successCount || 0;
				const sFailCount = failCount || 0;

				// autoResizeColumn
				oTableControl.attachEventOnce("rowsUpdated", () => {
					const aColumns = oTableControl.getColumns().filter((oColumn) => oColumn.getVisible());
					// エラーメッセージ列の column index を取得
					const iColIndex = aColumns?.findIndex(
						(oColumn) => oColumn.getName() === this.oBundle.getText("headerErrorMessages")
					);
					if (iColIndex !== -1) {
						// 指定列（index）の列幅を表示中の行データ(セル)に基づいてリサイズ
						oTableControl.autoResizeColumn(iColIndex);
					}
				});

				aParsedData.forEach((oItem) => {
					const sNo = oItem.OUTNO.trim();
					const oRow = aTableContext.find((oData) => oData.OUTNO === sNo); // No
					const iIndex = aTableContext.indexOf(oRow);

					// Update value for [エラーメッセージ]
					if (oItem.OUTERROR_MESSAGE !== "") {
						oRow.OUTERROR_MESSAGE = oItem.OUTERROR_MESSAGE?.trim();
					} else {
						// delete row
						aTableContext.splice(iIndex, 1);
					}
				});
				this._setODataTable(aTableContext);
				this._getTableModel().refresh();
				this._toggleErrorColumnVisibility();

				if (sFailCount === 0) {
					const oMessage = Message.createSuccessMessage(this.oBundle.getText("SuccessPopup"));
					MessageBox.show(oMessage.description, {
						icon: MessageBox.Icon.SUCCESS,
						...oMessage,
					});
				} else {
					const oMessage = Message.createErrorMessage(this.oBundle.getText("ErrorPopup"));
					MessageBox.show(oMessage.description, {
						icon: MessageBox.Icon.ERROR,
						...oMessage,
					});
				}

				const oScreenModel = this._getScreenModel();
				const aMessages = [
					Message.createInformationMessage(
						this.oBundle.getText("INFORMATION018", [sSuccessCount, sFailCount])
					),
				];

				// Set messages to messagepopover control
				oScreenModel.setProperty("/Messages", aMessages);

				const iCount = 1;
				// Set message button text, visibility
				oScreenModel.setProperty("/MessageCount", iCount);
				oScreenModel.setProperty("/HaveMessage", iCount !== 0);

				const sButtonType = "Default";
				const sButtonIcon = "sap-icon://message-information";

				// Set message button type, icon
				oScreenModel.setProperty("/MessageButtonType", sButtonType);
				oScreenModel.setProperty("/MessageButtonIcon", sButtonIcon);

				return Promise.resolve();
			},
		});
	}
);
