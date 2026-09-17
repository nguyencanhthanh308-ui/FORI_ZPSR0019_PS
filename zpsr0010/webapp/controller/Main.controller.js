sap.ui.define(
	[
		"sap/ui/core/mvc/Controller",
		"sap/ui/core/BusyIndicator",
		"sap/ui/core/ValueState",
		"sap/ui/core/Fragment",
		"sap/ui/model/FilterOperator",
		"sap/ui/model/json/JSONModel",
		"sap/ui/model/Filter",
		"zpsr0010/model/models",
		"sap/base/util/deepExtend",
		"sap/m/MessageBox",
		"zpsr0010/utils/common",
		"zpsr0010/utils/variant",
		"zpsr0010/utils/constant",
		"zpsr0010/libs/xlsx",
		"../handler/controlHandler/p13nDialogPopup",
		"../handler/debounce/debounce",
		"../handler/errorHandler/ErrorHandler",
		"../handler/formatter/formatter",
		"../handler/helper/Validator",
		"../handler/helper/Message",
	],
	/**
	 * @param {typeof sap.ui.core.mvc.Controller} Controller
	 */
	function (
		Controller,
		BusyIndicator,
		ValueState,
		Fragment,
		FilterOperator,
		JSONModel,
		Filter,
		models,
		deepExtend,
		MessageBox,
		common,
		variant,
		constant,
		XLSX,
		p13nDialogPopup,
		Debounce,
		ErrorHandler,
		Formatter,
		Validator,
		Message
	) {
		"use strict";

		return Controller.extend("zpsr0010.controller.Main", {
			oBundle: null,
			aDeleteList: [],
			onInit: async function () {
				this._initDataModel();
				const oStartupParameters = this._getMyComponent().getComponentData().startupParameters;
				const sIdVariant = oStartupParameters["variant-id"] ? oStartupParameters["variant-id"][0] : null;
				await this._setValuePlant();
				await this._connectPersonalizationService(sIdVariant);
				await this._setODataSearchHelp();
				this._handleLogicBookmark();

				// Add event press for DateRangeSelection - No8
				let oItem = this.byId("BDTER001");
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
			 * Get search help data and set to search help model
			 */
			_setODataSearchHelp: function () {
				BusyIndicator.show(0);
				const aPromise = [
					//Remove search help
					// this._readOData([], "Mat0mSet").then((oData) =>
					//   this._setSearchHelpProperty(oData, "Mat0mSet")
					// ),

					this._readOData([], "SearchHelpPlantSet").then((oData) =>
						this._setSearchHelpProperty(oData, "SearchHelpPlantSet")
					),

					this._readOData([], "SearchHelpPurTypeSet").then((oData) => {
						oData.results.unshift({ Code: "", Text: "" });
						return this._setSearchHelpProperty(oData, "SearchHelpPurTypeSet");
					}),

					// this._readOData([], "SearchHelpSkoJoukyouSet").then((oData) =>
					//   this._setSearchHelpProperty(oData, "SearchHelpSkoJoukyouSet")
					// );

					this._readOData([], "SearchHelpStgLocationSet").then((oData) =>
						this._setSearchHelpProperty(oData, "SearchHelpStgLocationSet")
					),

					this._readOData([], "SearchHelpUnitSet").then((oData) =>
						this._setSearchHelpProperty(oData, "SearchHelpUnitSet")
					),

					// No.1527 - get search help for [組計状況]
					this._readOData([], "SearchHelp_TXT30Set").then((oData) => {
						const aSortedResults = this._sortAssemblyStatusSearchHelp(oData.results || []);
						this._setSearchHelpProperty({ ...oData, results: aSortedResults }, "SearchHelp_TXT30Set");
					}),
				];
				return Promise.all(aPromise)
					.then(() => BusyIndicator.hide())
					.catch(() => BusyIndicator.hide());
			},

			/**
			 * Sort Search Help [組計状況] by custom order - No.1527
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
			 * BOOKMARK logic
			 */
			_handleLogicBookmark: function () {
				this._handleSetBookmarkData();
				this.handleSetValueParamToFilter(this.getView(), this._getScreenModel());
			},

			/**
			 * handle custom URL
			 * No.1527 - handle count number on Bookmark
			 */
			_handleSetBookmarkData: function () {
				const oView = this.getView();
				const oAddToHome = oView.byId("addToHome");
				let sFilter = "";
				oAddToHome.attachBrowserEvent(
					"click",
					async function () {
						sFilter = await this._getODataQueryStringFromFilter(this);
					}.bind(this)
				);
				oAddToHome.setBeforePressHandler(() => {
					const oView = this.getView();
					const oFilter = this._getScreenModel();
					const customURL = this.handleGetCustomURL(oView, oFilter);
					const sServiceURL = this.getOwnerComponent().getModel().sServiceUrl;
					const oData = {
						title: this.oBundle.getText("appTitle"),
						icon: "sap-icon://home",
						serviceUrl: `${sServiceURL}/ComponentItemSchListSet/$count${sFilter}`,
						serviceRefreshInterval: 10,
						customUrl: customURL,
					};
					oAddToHome.setAppData(oData);
				});
			},

			/**
			 * No.1527
			 * Stringify sap.ui.model.Filter into string suitable odata query
			 * @returns
			 */
			_getODataQueryStringFromFilter: async function (oController) {
				const _converFilterToString = function (oSingleFilter) {
					const sPath = oSingleFilter.getPath();
					const sOperator = oSingleFilter.getOperator()?.toLowerCase();
					const sValue1 = oSingleFilter.getValue1();
					const sValue2 = oSingleFilter.getValue2();
					switch (sOperator) {
						case "eq":
						case "ne":
						case "lt":
						case "le":
						case "gt":
						case "ge":
							return `${sPath} ${sOperator} '${sValue1}'`;
						case "bt":
							return `${sPath} ge '${sValue1}' and ${sPath} le '${sValue2}'`;
						case "contains":
							return `substringof('${sValue1}', ${sPath})`;
						default:
							return `${sPath} ${sOperator} '${sValue1}'`;
					}
				};

				let sResults = "";
				try {
					const aFilters = await oController._getFilters();
					sResults = aFilters
						.map((oFilter) => {
							const aMultiFilters = oFilter.getFilters();
							if (aMultiFilters) {
								const sConvertFilter = aMultiFilters.map((oSingleFilter) => {
									return `${_converFilterToString(oSingleFilter)}`;
								});
								return `(${sConvertFilter.join(" or ")})`;
							} else {
								return `(${_converFilterToString(oFilter)})`;
							}
						})
						.join(" and ");
				} catch {
					return "";
				}
				return sResults ? `?$filter=${sResults}` : "";
			},

			/**
			 * handle custom URL
			 */
			handleGetCustomURL: function (oView, oFilterModel) {
				let oURLParsing = sap.ushell.Container.getService("URLParsing");

				const aParams = [];
				const oVariant = oView.byId("Variants");
				const sVariantId = oVariant.getSelectionKey();
				const sVariantIndex = this._handleGetKeyByGenerateKey(sVariantId);
				const sSizeLimit = this._getScreenModel().getProperty("/recordVisibleSelected");
				const sLanguage = sap.ushell.Container.getService("UserInfo").getUser().getLanguage();

				const sHash = oURLParsing.getHash(window.location.hash);
				if (sVariantIndex) {
					aParams.push(`variant-id=${sVariantIndex}`);
				}
				sSizeLimit && aParams.push(`size-limit=${sSizeLimit}`);
				const aFilterItems = oView.byId("filterbar").getAllFilterItems();
				const oFilter = oFilterModel.getData();
				aFilterItems.forEach((oItem) => {
					const sName = oItem.getProperty("name");
					if (sName === "Inbdter001") {
						oFilter["Inbdter001From"] &&
							aParams.push(`Inbdter001From=${common.getFullDateFromNewDate(oFilter["Inbdter001From"])}`);
						oFilter["Inbdter001To"] &&
							aParams.push(`Inbdter001To=${common.getFullDateFromNewDate(oFilter["Inbdter001To"])}`);
					}
					// No.1527 - Handle value for [組計状況]
					if (sName === "Inznw3status" && oFilter[sName].length === 0) {
						return;
					}
					if (oFilter[sName]) {
						oFilter[sName] && aParams.push(`${sName}=${oFilter[sName]}`);
					}
				});
				return `#${sHash?.split("?")[0] || "zpsr0010"}?${aParams.join("&")}`;
			},

			/**
			 * handle get object component
			 */
			_getMyComponent: function () {
				const sComponentId = sap.ui.core.Component.getOwnerIdFor(this.getView());
				return sap.ui.component(sComponentId);
			},

			/**
			 * Set value param to filter
			 */
			handleSetValueParamToFilter: function (oView, oFilter) {
				const oStartupParameters = this._getMyComponent().getComponentData().startupParameters;
				let bSearch = false;
				for (const key in oStartupParameters) {
					let parsedValue = decodeURIComponent(decodeURIComponent(oStartupParameters[key][0]));

					if (key === "Inbdter001From") {
						oFilter.setProperty(`/${key}`, new Date(parsedValue));
						continue;
					}
					if (key === "Inbdter001To") {
						oFilter.setProperty(`/${key}`, new Date(parsedValue));
						continue;
					}
					if (key === "size-limit") {
						this._getScreenModel().setProperty("/recordVisibleSelected", Number(parsedValue));
						continue;
					}
					// No.1527 - Handle value for [組計状況]
					if (key === "Inznw3status") {
						oFilter.setProperty(`/${key}`, parsedValue.split(","));
						continue;
					}

					oFilter.setProperty(`/${key}`, parsedValue);
					bSearch = true;
				}
				bSearch && oView.byId("SearchBtn").firePress();
			},

			/**
			 * BOOKMARK
			 */
			_initDataModel: function () {
				//model for i18n
				this.oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

				const oView = this.getView();
				oView.setModel(this._getOdataModel());
				//model for screen
				oView.setModel(models.createMainScreenModel(), "screen");
				//model for table //Model BuildingCode
				this.getView().setModel(models.createReportListModel(), "reportList");
				oView.setModel(models.createSearchHelpModel(), "searchHelpModel");
				oView.setModel(models.createDropdownModel(), "dropdown");
			},

			/**
			 * handle init delete list
			 */
			_initDeleteList: function () {
				this.aDeleteList = [];
				return Promise.resolve();
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

			_handleSetVisibleRow: function () {
				this.onChangeRecordVisible();
			},

			/**
			 * handle event on change of pulldown record visible
			 */
			onChangeRecordVisible: function (oEvent) {
				const oModel = this._getTableModel().getData();
				const iLenData = oModel.length;
				// set amount record visible
				const oTable = this._getTableControl();
				const oScreenModel = this._getScreenModel();

				if (oEvent) {
					oScreenModel.setProperty("/recordVisibleSelected", oEvent.getSource().getValue());
				}

				const iCountDefault = oScreenModel.getProperty("/recordVisibleSelected");

				oTable.setVisibleRowCount(+(iCountDefault > iLenData ? iLenData || 1 : iCountDefault));
			},

			/**
			 * setModelBuildingCodeData
			 */
			_setModelReportListData: function (oData) {
				this.getView().setModel(new JSONModel(oData.results), "reportList");
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
			 * _setModelplant
			 */
			_setModelPlant: function (oData) {
				this.getView().setModel(new JSONModel(oData.results), "Plant");
			},

			/**
			 * Get OData model
			 */
			_getOdataModel: function () {
				return this.getOwnerComponent().getModel();
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

			/**
			 * Get Table model
			 */
			_getTableModel: function () {
				return this.getView().getModel("reportList");
			},

			/**
			 * Get Table UI control
			 */
			_getTableControl: function () {
				return this.getView().byId("table");
			},

			/**
			 * Clear screen messages
			 */
			_clearMessages: function () {
				return this._resetMessages([]);
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
					// No.2162 Register must show this confirmation popup on error and Excel import must NOT show it
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
			 * OData model read data
			 */
			_readOData: function (aFilters = [], PATH = "ComponentItemSchListSet") {
				// Reset register button after the main table reloads - No.2204
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
									this._getScreenModel().setProperty("/totalRecord", 0);
								}
								fReject({ aMessages });
							}.bind(this),
						});
					}.bind(this)
				);
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
					.getModel("searchHelpModel")
					.getProperty(`/SearchHelpStgLocationSet`);
				oData.results.forEach((item) => {
					const iIssuedQuantity = parseFloat((item?.Outenmng001 || "").trim().replaceAll(",", ""));
					const iRequiredQuantity = parseFloat((item?.Outbdmng002 || "").trim().replaceAll(",", ""));
					const iAllocatedQuantity = parseFloat((item?.Outhikiatesuryo001 || "").trim().replaceAll(",", "")); // [引当数量] - No.2101
					item.Outenmng001 = item?.Outenmng001?.trim() ? Number(iIssuedQuantity).toFixed(3) : ""; // [引落数量] - No.1642
					item.Outbdmng002 = item?.Outbdmng002?.trim() ? Number(iRequiredQuantity).toFixed(3) : ""; // [所要数量] - No.1642
					item.Outhikiatesuryo001 = item?.Outhikiatesuryo001?.trim()
						? Number(iAllocatedQuantity).toFixed(3)
						: ""; // [引当数量] - No.2101
					item.Outerfmg001 = `${Math.round(item?.Outerfmg001) || ""}`; // [数量] - No.1642

					const bIsIssueComplete = item?.Outkzear001 === "X";
					item.Outkzear001 = bIsIssueComplete ? "済" : "未";
					item.Outhikiatesuryo001 = bIsIssueComplete ? "" : item.Outhikiatesuryo001; // Set [引当数量] blank when [出庫完了フラグ] = '済' - No.2101

					// ADD: Check if the value of Lgort key exists in the Combobox item
					const bLocationExists = aStgLocationSetItems.some((oItem) => oItem.Lgort === item.Outlgort002);

					// ADD: set Outlgort002value
					//      If the value of the Lgort key does not exist in the Combobox item, set it to blank.
					item.Outlgort002value = bLocationExists ? item.Outlgort002 : "";

					item.Outbdmng001value = item.Outbdmng001; // 購買依頼タイプ - No.2162
					item.Outrgekz001 = item?.Outrgekz001 === "X"; // [BF] - No.2047
				});

				this._initialSortProperties(oData.results);
				this._getScreenModel().setProperty("/totalRecord", oData.results.length);
				if (flagIndex) {
					this._setODataTable(this._handleSetIndexOData(oData));
				} else {
					this._setODataTable(oData);
					// this._getTableModel().setData(oData.results);
				}
				this._handleSetVisibleRow();
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
				const aSortField = [...constant.NumberColumns, ...constant.AmountColumns];
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

			/** Event handle onPressClear */
			onPressClearButton: function () {
				const oScreenModel = this._getScreenModel();
				oScreenModel.setProperty("/Inkidaino001", "");
				oScreenModel.setProperty("/Insortl001", "");
				oScreenModel.setProperty("/Intaskcode001", "");
				oScreenModel.setProperty("/Inusr02001", "");
				oScreenModel.setProperty("/Inmatnr001", "");
				oScreenModel.setProperty("/Inwerks001", "");
				oScreenModel.setProperty("/Inzuban001", "");
				oScreenModel.setProperty("/Inshukkosaki001", "");
				oScreenModel.setProperty("/Inbdter001From", null);
				oScreenModel.setProperty("/Inbdter001To", null);
				oScreenModel.setProperty("/Inshukkojoukyou001", "");
				oScreenModel.setProperty("/Injitsushukkono001", "");
				oScreenModel.setProperty("/Ingort001", "");
				oScreenModel.setProperty("/Inplno001", "");
				oScreenModel.setProperty("/Inoyahinban001", "");
				oScreenModel.setProperty("/Inshorino001", "");
				oScreenModel.setProperty("/RequirementValue", null);
				oScreenModel.setProperty("/Inkzear001", "");
				oScreenModel.setProperty("/Inbdmng001", "");
				oScreenModel.setProperty("/Inznw3status", []); // No.1527 - Add clear Assembly Status

				this.getView().byId("LGORT001").setValue("");
				this.getView().byId("BDMNG002Filter").setValue("");

				this._clearMessages();
				// Clear value state - Update 20260212
				this._clearValueState(constant.IdDateFieldsFilter);
			},

			/**
			 * Event handling when Search button pressed
			 */
			onPressSearchButton: function () {
				this._getScreenModel().setProperty("/bCheckAll", false);
				//get filters from screen
				BusyIndicator.show(0);
				this._getFilters()
					// Clear all messages before search to avoid confusion with past messages - No.2204
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
			 * Clear all messages and pass through data for chaining - No.2204
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

				// check require field プラント
				if (!oFilter.Inwerks001) {
					oFilter["valueStateInwerks001"] = ValueState.Error;
					oFilter["valueStateTextInwerks001"] = this.oBundle.getText("Error001");
					const oMessages = {
						type: "Error",
						title: this.oBundle.getText("ErrorTitleRequire"),
						description: this.oBundle.getText("Error001"),
						subtitle: this.oBundle.getText("Error001"),
						counter: 1,
					};

					aMessages.push(oMessages);
				} else {
					// Fix Fiori issue - No.1440
					oFilter["valueStateInwerks001"] = ValueState.None;
					oFilter["valueStateTextInwerks001"] = "";
				}

				// Handle message when date is invalid - Update 20260209
				if (!this._validateInputs(constant.IdDateFieldsFilter)) {
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
					!oFilter.Inkidaino001 &&
					!oFilter.Inmatnr001 &&
					!(oFilter.Inbdter001From || oFilter.Inbdter001To)
				) {
					oFilter["valueStateInkidaino001"] = ValueState.Error;
					oFilter["valueStateTextInkidaino001"] = this.oBundle.getText("Error003");
					oFilter["valueStateInmatnr001"] = ValueState.Error;
					oFilter["valueStateTextInmatnr001"] = this.oBundle.getText("Error003");
					oFilter["valueStateInbdter001"] = ValueState.Error;
					oFilter["valueStateTextInbdter001"] = this.oBundle.getText("Error003");
					const oMessages = {
						type: "Error",
						title: this.oBundle.getText("ErrorTitleRequire"),
						description: this.oBundle.getText("Error003"),
						subtitle: this.oBundle.getText("Error003"),
						counter: 1,
					};

					aMessages.push(oMessages);
				} else {
					oFilter["valueStateInkidaino001"] = ValueState.None;
					oFilter["valueStateTextInkidaino001"] = "";
					oFilter["valueStateInmatnr001"] = ValueState.None;
					oFilter["valueStateTextInmatnr001"] = "";
					oFilter["valueStateInbdter001"] = ValueState.None;
					oFilter["valueStateTextInbdter001"] = "";
				}
				//機台NO（前方一致）- Update No.2006
				if (oFilter.Inkidaino001) {
					aFilters.push(new Filter("Inkidaino001", FilterOperator.StartsWith, oFilter.Inkidaino001));
				}
				//組立かたまり
				if (oFilter.Insortl001) {
					aFilters.push(new Filter("Insortl001", FilterOperator.EQ, oFilter.Insortl001));
				}
				//出庫タスク
				if (oFilter.Intaskcode001) {
					aFilters.push(new Filter("Intaskcode001", FilterOperator.EQ, oFilter.Intaskcode001));
				}
				//要求NO
				if (oFilter.Inusr02001) {
					aFilters.push(new Filter("Inusr02001", FilterOperator.EQ, oFilter.Inusr02001));
				}
				//品目
				if (oFilter.Inmatnr001) {
					aFilters.push(new Filter("Inmatnr001", FilterOperator.EQ, oFilter.Inmatnr001));
				}
				//プラント
				if (oFilter.Inwerks001) {
					aFilters.push(new Filter("Inwerks001", FilterOperator.EQ, oFilter.Inwerks001));
				}
				//図番
				if (oFilter.Inzuban001) {
					aFilters.push(new Filter("Inzuban001", FilterOperator.EQ, oFilter.Inzuban001));
				}
				//出庫先
				if (oFilter.Inshukkosaki001) {
					aFilters.push(new Filter("Inshukkosaki001", FilterOperator.EQ, oFilter.Inshukkosaki001));
				}
				//所要日付
				if (oFilter.Inbdter001From && oFilter.Inbdter001To) {
					aFilters.push(
						new Filter(
							"Inbdter001",
							FilterOperator.BT,
							this.onFormatObjectDate(oFilter.Inbdter001From),
							this.onFormatObjectDate(oFilter.Inbdter001To)
						)
					);
				}
				if (oFilter.Inbdter001From && !oFilter.Inbdter001To) {
					aFilters.push(
						new Filter("Inbdter001", FilterOperator.GE, this.onFormatObjectDate(oFilter.Inbdter001From))
					);
				}
				//出庫指示状況
				if (oFilter.Inshukkojoukyou001) {
					const Inshukkojoukyou001 = oFilter.Inshukkojoukyou001 === "X" ? "X" : "";
					aFilters.push(new Filter("Inshukkojoukyou001", FilterOperator.EQ, Inshukkojoukyou001));
				}
				//実出庫NO
				if (oFilter.Injitsushukkono001) {
					aFilters.push(new Filter("Injitsushukkono001", FilterOperator.EQ, oFilter.Injitsushukkono001));
				}
				//保管場所
				if (oFilter.Ingort001 || this.getView().byId("LGORT001").getValue()) {
					aFilters.push(
						new Filter(
							"Ingort001",
							FilterOperator.EQ,
							oFilter?.Ingort001 || this.getView().byId("LGORT001").getValue().trim()
						)
					);
				}
				//PL
				if (oFilter.Inplno001) {
					aFilters.push(new Filter("Inplno001", FilterOperator.EQ, oFilter.Inplno001));
				}
				//親品番
				if (oFilter.Inoyahinban001) {
					aFilters.push(new Filter("Inoyahinban001", FilterOperator.EQ, oFilter.Inoyahinban001));
				}
				//処理NO
				if (oFilter.Inshorino001) {
					aFilters.push(new Filter("Inshorino001", FilterOperator.EQ, oFilter.Inshorino001));
				}

				// hieught add code --- 出庫完了フラグ
				if (oFilter.Inkzear001) {
					const Inkzear001 = oFilter.Inkzear001 === "X" ? "X" : "";
					aFilters.push(new Filter("Inkzear001", FilterOperator.EQ, Inkzear001));
				}

				// No738 Filter by [購買依頼タイプ] 🐍
				if (oFilter.Inbdmng001 || this.getView().byId("BDMNG002Filter").getValue()) {
					aFilters.push(
						new Filter(
							"Inbdmng001",
							FilterOperator.EQ,
							oFilter?.Inbdmng001.trim() || this.getView().byId("BDMNG002Filter").getValue()
						)
					);
				}

				// No.1527 - Filter by [組計状況]
				if (Array.isArray(oFilter.Inznw3status) && oFilter.Inznw3status.length) {
					aFilters.push(this._getFiltersFromTokenModel(oFilter.Inznw3status, "Inznw3status"));
				}

				if (aMessages.length === 0) {
					return Promise.resolve(aFilters);
				} else {
					return Promise.reject({ aMessages });
				}
			},

			/**
			 * No.1527 - Get filter values from model
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
			 * handle add table
			 */
			onPressAddButton: function () {
				const oTableControl = this._getTableControl();
				const oTableReportModel = this._getTableModel();
				const oTableReportData = oTableReportModel.getData();
				const oScreenModel = this._getScreenModel();
				const sWerks = oScreenModel.getProperty("/Inwerks001");
				oTableReportData.push({
					Outkidaino001: "",
					Outsortl002: "",
					Outmatnr002: "",
					Outwerks002: sWerks,
					Outbdmng001: "",
					Outbdmng001value: "", // 購買依頼タイプ - No.2162
					Outbdmng002: "",
					Outmeins001: "",
					Outerfmg001: "", // [数量] - No.2162
					Outerfme001: "", // 入力単位 - No.1642
					Outbdter002: "",
					Outtaskcode002: "",
					Outshukkosaki002: "",
					Outzuban002: "",
					Outpositionno001: "",
					Outplno001: "",
					Outoyahinban001: "",
					Outhojohinban001: "",
					Outkzmpf001: "",
					Outrsnum001: "", //入出庫予定番号 - No.1469
					Outrspos001: "", //入出庫予定明細番号 - No.1469
					Outposnr001: "", //BOM明細番号 - No.1469
					Outenmng001: "0.000", // 引落数量 - No.1642
					Outhikiatesuryo001: "0.000", // 引当数量 - No.2101
					Outlgortold001: "", // 保管場所(旧) - No.1586
					Outrgekz001: false, // BF - No.2047
					operation: "I",
					selected: true,
					insert: true,
				});
				oTableReportData.forEach((data, index) => {
					data.index = index + 1;
				});
				oTableReportModel.refresh();
				oTableControl.setFirstVisibleRow(oTableReportData.length - 1);
				this._getScreenModel().setProperty("/totalRecord", oTableReportData.length);
				this._handleSetVisibleRow();
				this._clearMessages();
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
				this._handleSetVisibleRow();
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
			 * handle logic copy button
			 */
			onPressCopyButton: function () {
				const aMessages = [];
				const oTableReportModel = this._getTableModel();
				const aTableReportData = oTableReportModel.getData();
				const oTable = this._getTableControl();
				const oScreenModel = this._getScreenModel();
				const sWerks = oScreenModel.getProperty("/Inwerks001");
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
						oNewData.Outshukkojoukyou002 = oDataCopy.Outshukkojoukyou002; // 出庫指示状況
						oNewData.Outkidaino001 = oDataCopy.Outkidaino001; // 機台NO
						oNewData.Outsortl002 = oDataCopy.Outsortl002; // 組立かたまり
						oNewData.Outusr02002 = oDataCopy.Outusr02002; // 要求ＮＯ
						oNewData.Outmatnr002 = oDataCopy.Outmatnr002; // 品目
						oNewData.Outwerks002 = sWerks; // プラント
						oNewData.Outmaktx001 = oDataCopy.Outmaktx001; // 品名
						oNewData.Outbdmng001 = oDataCopy.Outbdmng001; // 調達タイプ
						oNewData.Outbdmng001value = oDataCopy.Outbdmng001; // 購買依頼タイプ - No.2162
						oNewData.Outbdmng002 = oDataCopy.Outbdmng002; // 所要数量
						oNewData.Outmeins001 = oDataCopy.Outmeins001; // 基本単位
						oNewData.Outerfmg001 = oDataCopy.Outerfmg001; // 数量 - No.1642
						oNewData.Outerfme001 = oDataCopy.Outerfme001; // 入力単位 - No.1642
						oNewData.Outbdter002 = oDataCopy.Outbdter002; // 所要日付
						oNewData.Outtaskcode002 = oDataCopy.Outtaskcode002; // 出庫タスク
						oNewData.Outshukkosaki002 = oDataCopy.Outshukkosaki002; // 出庫先
						oNewData.Outzuban002 = oDataCopy.Outzuban002; // 図番
						oNewData.Outpositionno001 = oDataCopy.Outpositionno001; // ポジション
						oNewData.Outplno001 = oDataCopy.Outplno001; // PL
						oNewData.Outoyahinban001 = oDataCopy.Outoyahinban001; // 親品番
						oNewData.Outhojohinban001 = oDataCopy.Outhojohinban001; // 補助品番
						oNewData.Outshorino002 = oDataCopy.Outshorino002; // 処理NO
						oNewData.Outlgort002 = oDataCopy.Outlgort002; // 保管場所
						oNewData.Outlgort002value = oDataCopy.Outlgort002; // 保管場所 - No.1642
						oNewData.Outrgekz001 = oDataCopy.Outrgekz001; // BF - No.2047
						oNewData.Outjitsushukkono002 = oDataCopy.Outjitsushukkono002; // 実出庫NO
						oNewData.Outrsnum001 = ""; // 入出庫予定番号 - No.1469
						oNewData.Outrspos001 = ""; // 入出庫予定明細番号 - No.1469
						oNewData.Outposnr001 = ""; // BOM明細番号 - No.1469
						oNewData.Outenmng001 = "0.000"; // 引落数量 - No.1642
						oNewData.Outhikiatesuryo001 = "0.000"; // 引当数量 - No.2101
						oNewData.Outlgortold001 = ""; // 保管場所(旧) - No.1586
						oNewData.selected = true;
						oNewData.operation = "I";
						oNewData.insert = true;
						oNewData.index = ++iLastIndex;
						oNewData.Outkzmpf001 = "";
						aTableSorted.splice(iUpdatePos + 1, 0, oNewData);
					});

					oTableReportModel.setData(aTableSorted);
					this._getScreenModel().setProperty("/totalRecord", aTableSorted.length);
					this._handleSetVisibleRow();
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
				if (oInput.getId().includes("BDTER002")) {
					const bValidDate = oInput.isValidValue();
					if (!bValidDate) {
						oRow["valueStateOutbdter002"] = ValueState.Error;
						oRow["valueStateTextOutbdter002"] = this.oBundle.getText("ErrorDate"); // Change message in value text - Update 20260212
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
			 * Reset value state input filterbar
			 */
			onChangeValidateFilter: function (oEvent, sField) {
				const oInput = oEvent.getSource();
				const sValue = oInput.getValue();
				const oFilter = this._getScreenModel().getData();
				if (sField === "Inwerks001") {
					if (sValue) {
						oFilter["valueStateInwerks001"] = ValueState.None;
						oFilter["valueStateTextInwerks001"] = "";
					}
				} else if (sField === "Inbdter001") {
					this._checkValidDateField(oEvent); // Handle check change on filter date fields  - Update 20260212
				} else {
					if (sValue) {
						oFilter["valueStateInkidaino001"] = ValueState.None;
						oFilter["valueStateTextInkidaino001"] = "";
						oFilter["valueStateInmatnr001"] = ValueState.None;
						oFilter["valueStateTextInmatnr001"] = "";
						oFilter["valueStateInbdter001"] = ValueState.None;
						oFilter["valueStateTextInbdter001"] = "";
					}
				}
				this._getScreenModel().refresh();
			},

			/**
			 * handle get data for 調達タイプ from 品目 and プラント
			 */
			onProcurementTypeChange: function (oEvent) {
				const oRow = this._getORowData(oEvent);
				if (!oRow.Outbdmng001value && oRow.Outmatnr002 && oRow.Outwerks002) {
					const sPath = `SuggestForPurTypeSet(Inmatnr001='${oRow.Outmatnr002}',Inwerks001='${oRow.Outwerks002}')`;
					this._readOData([], sPath).then(
						function (oData) {
							oRow.Outbdmng001 = oData.Outbdmng001;
							oRow.Outbdmng001value = oData.Outbdmng001;
							oRow.valueStateOutbdmng001 = ValueState.None;
							this._getTableModel().refresh();
						}.bind(this)
					);
				}
			},

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
					"Outsortl002",
					"Outbdmng001",
					"Outtaskcode002",
					"Outshukkosaki002",
					"Outzuban002",
					"Outerfmg001", // [数量] - No.1642
					"Outerfme001", // [入力単位] - No.1642
				];
				const aFieldsCheckInsert = [
					"Outkidaino001",
					"Outsortl002",
					"Outmatnr002",
					"Outwerks002",
					"Outbdmng001",
					"Outerfmg001", // [数量] - No.1642
					"Outerfme001", // [入力単位] - No.1642
					"Outtaskcode002",
					"Outshukkosaki002",
					"Outzuban002",
					"Outpositionno001",
					"Outplno001",
					"Outoyahinban001",
					"Outhojohinban001",
				];

				const FIELD_LABEL_KEY_MAP = {
					Outsortl002: "headerAssemblyMass",
					Outbdmng001: "headerPurchaseRequisitionType",
					Outtaskcode002: "headerGoodsIssueTask",
					Outshukkosaki002: "headerDeliveryDestination",
					Outzuban002: "headerDrawingNumber",
					Outerfmg001: "headerInputQuantity",
					Outerfme001: "headerInputUnit",
					Outkidaino001: "headerMachineNo",
					Outmatnr002: "headerItem",
					Outwerks002: "headerPlant",
					Outpositionno001: "headerPosition",
					Outplno001: "headerPL",
					Outoyahinban001: "headerParentPartNumber",
					Outhojohinban001: "headerAuxiliaryPartNumber",
					Outbdter002: "headerRequiredDate",
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

				// No.2162 - Register must reuse the same 5-group validation (Length, Number, Select, Date, Flag) defines for Excel import
				const aRegisterMessages = await this._runRowValidations(aTableSelectedData);
				this._getTableModel().refresh();

				const aAllCheckMessages = [...aRequiredMessages, ...aRegisterMessages];
				if (aAllCheckMessages.length > 0) {
					return Promise.reject({ aMessages: aAllCheckMessages });
				}

				const aOdataFields = [
					"Outno001",
					"Outshukkojoukyou002",
					"Outkidaino001",
					"Outsortl002",
					"Outusr02002",
					"Outmatnr002",
					"Outwerks002",
					"Outmaktx001",
					"Outbdmng001",
					"Outbdmng002",
					"Outmeins001",
					"Outhikiatesuryo001", // 引当数量 - No.2101
					"Outbdter002",
					"Outtaskcode002",
					"Outshukkosaki002",
					"Outzuban002",
					"Outpositionno001",
					"Outplno001",
					"Outoyahinban001",
					"Outhojohinban001",
					"Outshorino002",
					"Outlgort002",
					"Outjitsushukkono002",
					"Outunchangeflg001",
					"Outrsnum001",
					"Outrspos001",
					"Outkzmpf001",
					"Outposnr001", // BOM明細番号 - No.1469
					"Outlgortold001", // 保管場所(旧) - No.1586
					"Outerfmg001", // 数量 - No.1642
					"Outerfme001", // 入力単位 - No.1642
					"Outrgekz001", // BF - No.2047
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
								if (sField === "Outbdter002") {
									oNewOdata[sField] = oData[sField].replace(/[-\/.]/g, "");
								} else if (sField === "Outrgekz001") {
									// [BF] - No.2047
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

								// Disable register button on Internal Server Error (500) - No.2204
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

			/**
			 * Get oRow data from oEvent
			 */
			_getORowData: function (oEvent) {
				const oRowData = oEvent.getSource().getBindingContext("reportList").getObject();
				if (oRowData) {
					return oRowData;
				} else {
					return {};
				}
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
			_setDataToValueHelp: function (oSelectDialog, title, sProperty, sTitle, sNoData, sDescription) {
				if (sNoData) {
					oSelectDialog.setNoDataText(this.oBundle.getText(sNoData));
				}

				oSelectDialog.setTitle(this.oBundle.getText(title));
				const standardListItem = new sap.m.StandardListItem({
					title: `{searchHelpModel>${sTitle}}`,
					type: "Active",
					description: `{=!\${searchHelpModel>${sDescription}} ? ' ' : \${searchHelpModel>${sDescription}}}`,
				});

				oSelectDialog.bindAggregation("items", {
					path: `searchHelpModel>/${sProperty}`,
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
			 * handle request value help
			 */
			onValueHelpRequest: function (oEvent) {
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
				// handle check 機台NO/machine No] [プラント/plant] when open 出庫タスク
				if (sInputId.includes("Z_TASK_CODE002")) {
					const { bResult: bValid } = this._handleCheckValidateCell(
						oRow,
						["Outkidaino001", "Outwerks002"],
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
						name: "zpsr0010.view.ValueHelpDialog",
						controller: this,
					}).then(
						async function (oDialog) {
							this.getView().addDependent(oDialog);
							//remove search help
							if (sInputId.includes("WERKS00")) {
								// プラント
								sItemSearch = "Code";
								this._readOData([], "SearchHelpPlantSet")
									.then(
										function (oData) {
											this._setSearchHelpProperty(oData, "SearchHelpPlantSet");
											this._setDataToValueHelp(
												oDialog,
												"heaederPlant",
												"SearchHelpPlantSet",
												"Code",
												"noDataTextPlant",
												"Text"
											);
										}.bind(this)
									)
									.finally(() => oDialog.setBusy(false));
							} else if (sInputId.includes("BDMNG001")) {
								// 調達タイプ
								sItemSearch = "Code";
								this._readOData([], "SearchHelpPurTypeSet")
									.then(
										function (oData) {
											this._setSearchHelpProperty(oData, "SearchHelpPurTypeSet");
											this._setDataToValueHelp(
												oDialog,
												"headerProcurement",
												"SearchHelpPurTypeSet",
												"Code",
												"noDataTextProcurement",
												"Text"
											);
										}.bind(this)
									)
									.finally(() => oDialog.setBusy(false));
							} else if (sInputId.includes("ERFME001")) {
								// 基本単位 - No.1642
								sItemSearch = "Code";
								this._readOData([], "SearchHelpUnitSet")
									.then(
										function (oData) {
											this._setSearchHelpProperty(oData, "SearchHelpUnitSet");
											this._setDataToValueHelp(
												oDialog,
												"headerInputUnit",
												"SearchHelpUnitSet",
												"Code",
												"noDataTextunit",
												"Text"
											);
										}.bind(this)
									)
									.finally(() => oDialog.setBusy(false));
							} else if (sInputId.includes("Z_TASK_CODE002")) {
								sItemSearch = "Ztaskcode";
								await this._handleSetModelTaskCodeSet(oRow).finally(() => oDialog.setBusy(false));
								this._setDataToValueHelp(
									oDialog,
									"headerGoodsIssueTask",
									"SearchHelpTaskCodeSet",
									"Ztaskcode",
									"noDataTextGoodsissuetask",
									"Zkidaino"
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

									if (sInputId.includes("Z_TASK_CODE002")) {
										oRow.valueStateOuttaskcode002 = ValueState.None;
										const sOutkidaino001 = oRow.Outkidaino001.replaceAll(" ", "%20");
										const sOutwerks002 = oRow.Outwerks002.replaceAll(" ", "%20");
										const sOuttaskcode002 = sSelectedValue.replaceAll(" ", "%20");
										const sPath = `SuggestForBdterSet(Inkidaino001='${sOutkidaino001}',Inwerks001='${sOutwerks002}',Intaskcode001='${sOuttaskcode002}')`;
										this._readOData([], sPath).then(
											function (oData) {
												oRow.Outbdter002 = oData.Outbdter002;
												oRow.valueStateOutbdter002 = ValueState.None;
												this._getTableModel().refresh();
											}.bind(this)
										);
									} else if (sInputId.includes("WERKS002")) {
										oRow.valueStateOutwerks002 = ValueState.None;
									} else if (sInputId.includes("BDMNG001")) {
										oRow.valueStateOutbdmng001 = ValueState.None;
									} else if (sInputId.includes("ERFME001")) {
										// [入力単位] - No.1642
										oRow.valueStateOuterfme001 = ValueState.None;
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
			 * Handle call API, set data to fragment value help
			 * @param {Object} oRow
			 */
			_handleSetModelTaskCodeSet: function (oRow) {
				const sOutkidaino001 = oRow.Outkidaino001;
				const sOutwerks002 = oRow.Outwerks002;
				const aFilter = [];
				aFilter.push(new Filter("Zkidaino", FilterOperator.EQ, sOutkidaino001));
				aFilter.push(new Filter("Werks", FilterOperator.EQ, sOutwerks002));
				return this._readOData(aFilter, "SearchHelpTaskCodeSet")
					.then((oData) => this._setSearchHelpProperty(oData, "SearchHelpTaskCodeSet"))
					.catch(() => this._setSearchHelpProperty(null, "SearchHelpTaskCodeSet"));
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
						const sValue = sField === "Outbdmng001" ? oRowData["Outbdmng001value"] || "" : oRowData[sField];
						const aFailMessages = Validator._controlValidations(
							oRowData,
							`valueState${sField}`,
							`valueStateText${sField}`,
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

			/**
			 * Event handling when button Download pressed
			 */
			onPressDownloadButton: function () {
				const oTable = this._getTableControl();
				const oView = this.getView();

				common.handleExportFile(oTable, this.oBundle, "zpsr0010", oView);
			},

			/**
			 * handle connect to the Personalization service when start app
			 */
			_connectPersonalizationService: async function (sIdVariant) {
				const oView = this.getView();
				await variant.connectPersonalizationService(oView, "zpsr0010Table", sIdVariant);
			},

			/**
			 * handle save when click the button [save as], rename in the popup manager
			 */
			onSaveAs: async function (oEvent) {
				const oView = this.getView();
				variant.onSaveAs(oEvent, oView);
			},

			/**
			 * handle logic when select the variant in the VariantManagement list
			 */
			onSelect: function (oEvent) {
				// flag to disable process show [save] button when trigger sort
				const oView = this.getView();
				variant.onSelect(oEvent, oView);
			},

			/**
			 * handle logic when click button [OK] Manager popup
			 * @param {*} oEvent
			 */
			onManage: async function (oEvent) {
				const oView = this.getView();
				variant.onManage(oEvent, oView);
			},

			/**
			 * Handle show the button save when resort, and save in the curent variant
			 */
			onDisplaySaveButton: async function () {
				const oView = this.getView();
				await variant.onDisplaySaveButton(oView);
				// this._handleAddSelectionInterval();
			},

			/**
			 * Handle bind value variant in the table
			 */
			_handleBindVariantAfterSearch: function () {
				const oView = this.getView();
				variant.handleBindVariantAfterChange(oView);
			},

			/**
			 * handle Get Key By Generate Key
			 * @param sGenerateKey
			 */
			_handleGetKeyByGenerateKey: function (sGenerateKey) {
				const oView = this.getView();
				return variant.handleGetKeyByGenerateKey(sGenerateKey, oView);
			},

			/**
			 * Handle show suggestion in Z_TASK_CODE002 input
			 */
			onFormatShowSuggestionZ_TASK_CODE002: function (oEvent) {
				const oInput = this.getView().byId("Z_TASK_CODE002");
				const oRow = this._getORowData(oEvent);
				if (oRow.Outkidaino001 && oRow.Outwerks002) {
					// call API get data for SearchHelpTaskCodeSet
					oInput.setShowSuggestion(true);
					this._handleSetModelTaskCodeSet(oRow);
				} else {
					oInput.setShowSuggestion(false);
				}
			},

			/**
			 *  Handle convert value date send to Backend
			 * @param {Object} oDate
			 * @returns {String} sDate with format YYYY/mm/DD
			 */
			onFormatObjectDate: function (oDate) {
				if (oDate) {
					const sDate = oDate.toLocaleDateString("af-ZA").replace(/[-\/.]/g, "");
					return sDate;
				}
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
			onFormatTextStorageLocation: function (sOutlgort002, sOutwerks002) {
				if (sOutlgort002) {
					const aDataSearchHelp = this._getSearchHelpModel().getData();
					const aSearchHelpStgLocationSet = aDataSearchHelp.SearchHelpStgLocationSet;
					let sTextFormated = "";
					for (let i = 0; i < aSearchHelpStgLocationSet.length; i++) {
						if (
							aSearchHelpStgLocationSet[i].Lgort === sOutlgort002 &&
							aSearchHelpStgLocationSet[i].Werks === sOutwerks002
						) {
							sTextFormated = `${aSearchHelpStgLocationSet[i].Lgort} : ${aSearchHelpStgLocationSet[i].Name1}`;
						}
					}
					return sTextFormated || sOutlgort002;
				}
			},

			/**
			 * Handle get data for 所要日付
			 */
			onChangeOuttaskcode002: function (oEvent) {
				const oRow = this._getORowData(oEvent);
				const sValue = oEvent.getSource().getValue();
				if (oRow.Outkidaino001 && oRow.Outwerks002 && sValue) {
					const sOutkidaino001 = oRow.Outkidaino001.replaceAll(" ", "%20");
					const sOutwerks002 = oRow.Outwerks002.replaceAll(" ", "%20");
					const sOuttaskcode002 = sValue.replaceAll(" ", "%20");
					const sPath = `SuggestForBdterSet(Inkidaino001='${sOutkidaino001}',Inwerks001='${sOutwerks002}',Intaskcode001='${sOuttaskcode002}')`;
					this._readOData([], sPath).then(
						function (oData) {
							oRow.Outbdter002 = oData.Outbdter002;
							oRow.valueStateOutbdter002 = ValueState.None;
							this._getTableModel().refresh();
						}.bind(this)
					);
				}
			},

			/**
			 * Reload SearchHelpStgLocationSet when change Inwerks001
			 */
			onLoadStgLocationSet: function (oEvent) {
				const sInwerks001 = oEvent.getSource().getValue();
				this._getScreenModel().setProperty("/Inwerks001", sInwerks001);
				this._handleReloadStgLocationSet(sInwerks001);
			},

			_handleReloadStgLocationSet: function (sInwerks001) {
				const aFilter = [];
				if (sInwerks001) {
					aFilter.push(new Filter("Werks", FilterOperator.EQ, sInwerks001));
					// check that Inwerks001 has been entered by user, do not reset Inwerks001 by Ingort001
					this.bChange = true;
				} else {
					this.bChange = false;
				}
				this._readOData(aFilter, "SearchHelpStgLocationSet").then((oData) =>
					this._setSearchHelpProperty(oData, "SearchHelpStgLocationSet")
				);
			},

			/**
			 * handle onChange Storage Area
			 */
			onChangeStgLocationSet: function (oEvent) {
				const oSelectedItem = oEvent
					.getSource()
					.getSelectedItem()
					.getBindingContext("searchHelpModel")
					.getObject();
				const sInwerks001 = oSelectedItem.Werks;
				if (!this.bChange) {
					this._getScreenModel().setProperty("/Inwerks001", sInwerks001);
					this._getScreenModel().setProperty("/valueStateInwerks001", ValueState.None);
				}
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

			/**
			 * Set Value Input Plant when Onit
			 */
			_setValuePlant: function () {
				//get id user
				const sUserId = sap.ushell.Container.getService("UserInfo").getUser().getId();
				const PATH = `Zcds_get_user(p_user='${sUserId}')/Set`;
				const oScreenModel = this._getScreenModel();
				//read api
				this._getSubOdataModel().read(`/${PATH}`, {
					success: function (oData) {
						const oExistWRK = oData.results.find((oItem) => oItem.parid === "WRK");
						if (oExistWRK) {
							oScreenModel.setProperty("/Inwerks001", oExistWRK.werks);
						}
					},
				});
			},

			/**
			 * Get Odata subModel
			 */
			_getSubOdataModel: function () {
				return this.getOwnerComponent().getModel("subModel");
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

			/* Handle Press Download Format Import // No734 - add new function (hieught) */
			onPressDownloadFormatExcel: function (oEvent) {
				this._clearMessages();
				const oTable = this._getTableControl();
				const aContext = this._getTableContextData(oTable);
				const aColumns = oTable?.getColumns();
				const aDataSearchHelp = this._getSearchHelpModel().getData();
				const aPurType = aDataSearchHelp?.SearchHelpPurTypeSet || [];
				const aSearchHelpStgLocationSet = aDataSearchHelp?.SearchHelpStgLocationSet || [];

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
						Outshukkojoukyou002: item?.Outshukkojoukyou002 ? "済" : "未",
						Outbdter002: common._formatDateToYMD(item?.Outbdter002),
						Outrgekz001: item?.Outrgekz001 === true ? "X" : "", // [BF] - No.2047
					})) || [];

				// Init columns label names
				const aColumnName = aColumns
					?.map((item) => {
						return item.getName() || "";
					})
					.slice(1);
				// Add hidden column to column
				aColumnName?.push(...constant.HiddenColumns);

				// Init columns data names
				const aColumnProps = aColumns
					?.map((item) => {
						return item.getSortProperty().replace("Sort", "") || "";
					})
					.slice(1);
				// Add hidden column data to column dataa
				aColumnProps?.push(...constant.HiddenColumnsData);

				// Set Excel width
				aColumnName.forEach((sColumnName) => {
					aColWidth.push({ wch: sColumnName.length + 20 });
				});

				// Format add color to disable columns
				aDataFormart?.forEach((oContextItem) => {
					const aRowItems = [];
					// No.1527 - Handle disabling [購買依頼タイプ] when [引落数量] equals 0
					const aDisableColumns = [...constant.DisableColumns];
					if (oContextItem.Outenmng001 !== "0" && oContextItem.Outenmng001 !== "0.000") {
						aDisableColumns.push("購買依頼タイプ");
					}

					for (let i = 0; i < aColumnName.length; i++) {
						const bIsHidden = constant.HiddenColumns.includes(aColumnName[i]);
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
				}, `${constant.UsageGuideTitle}\r\n`);

				//No1065 🐍 - Add Title保管場所
				const sStgLocationSet = aSearchHelpStgLocationSet.reduce((sAccumulator, oItem) => {
					if (!oItem.Lgort) {
						return sAccumulator + `\r\n`;
					} else {
						return sAccumulator + `${oItem?.Lgort || ""} : ${oItem?.Name1 || ""}\r\n`;
					}
				}, `${constant.UsageGuideTitle}\r\n`);

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

						//No1065 🐍 - Add Title 保管場所
						if (a[sKey]?.v === this.oBundle.getText("headerStorageLocation")) {
							if (!a[sKey].c) {
								a[sKey].c = [];
							}
							a[sKey].c.hidden = true;
							a[sKey].c.push({ a: "保管場所", t: sStgLocationSet });
						}
					}
				});

				const optionsMaxLength = Math.max(aPurType.length, aSearchHelpStgLocationSet.length);
				let purTypeList = [["購買依頼タイプ"]];
				let locationSetList = [["保管場所"]];

				for (let i = 0; i < optionsMaxLength; i++) {
					if (typeof aPurType[i] !== "undefined" && aPurType[i].Code !== "") {
						purTypeList.push([aPurType[i].Code, aPurType[i].Text]);
					}
					if (
						typeof aSearchHelpStgLocationSet[i] !== "undefined" &&
						aSearchHelpStgLocationSet[i].Lgort !== ""
					) {
						locationSetList.push([aSearchHelpStgLocationSet[i].Lgort, aSearchHelpStgLocationSet[i].Name1]);
					}
				}

				const usageGuide = [[`【${constant.UsageGuideTitle}】`], [], ...purTypeList, [], ...locationSetList];

				//add workSheet Tutorial
				const workSheet2 = XLSX.utils.aoa_to_sheet(usageGuide);
				XLSX.utils.book_append_sheet(workBook, workSheet2, constant.UsageGuideTitle);

				//generate file xlsx
				XLSX.writeFile(workBook, `${this.oBundle.getText("nameFile")}_${common._getCurrentDate()}.xlsx`, {
					compression: true,
				});
			},

			/* Handle Press Import File // No734 - add new function (hieught) */
			onPressImportFile: function (oEvent) {
				this._clearMessages();

				const aFiles = oEvent.getParameter("files");

				if (aFiles && aFiles.length > 0) {
					const oFile = aFiles[0];
					if (oFile.type === constant.XLSXType) {
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

			/* Handle Read File Excecl // No734 - add new function (hieught) */
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
						"(入出庫予定)": "Outrsnum001",
						"(明細番号)": "Outrspos001",
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
							Outbdter002:
								common.getFullDate(item?.Outbdter002)?.replace(/[^0-9]/g, "") ||
								item?.Outbdter002 ||
								"",
							Outshukkojoukyou002: item?.Outshukkojoukyou002 === "済" ? "X" : "",
							Outlgort002value: item?.Outlgort002 || "",
							Outbdmng001value: item?.Outbdmng001 || "",
						}));

						// No.2162 - Perform validation before calling _setResult(), before numbers/flags are formatted, to preserve the original invalid value.
						const aImportMessages = await self._runRowValidations(aNewData, true);
						self._setResult({ results: aNewData }, false);
						self._getTableModel().refresh();

						// No.2162 - import errors only highlight fields + list in the Message, NO confirmation popup for this case
						self._resetMessages({ aMessages: aImportMessages }, false, true);
						BusyIndicator.hide();
					} else {
						self._setODataTable({ results: [] });
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

			// No.2162 - validation for both Excel import and the Register button (Length, Number, Select, Date, Flag)
			_runRowValidations: async function (aRows, bIsImport = false) {
				const aMessages = [];
				const aSearchHelpData = this._getSearchHelpModel().getData();
				const aSelectedRows = aRows.filter((oItem) => oItem.selected);

				// No.2162 - these fields are only editable on newly inserted/copied
				const fnIsInsertOnlyField = (sField) =>
					Object.values(constant.InsertOnlyEditableFields).includes(sField);

				// No.2162 - Excel import excludes プラント from Select check; Register uses the full field list with the normal insert-only exemption
				const aSelectCheckFields = bIsImport ? constant.SelectCheckFieldsImport : constant.SelectCheckFields;

				// No.2162 - 出庫タスク's valid-value list depends on each row's (機台NO, プラント) and is NOT preloaded globally
				// No write to the sharedsearchHelpModel>/SearchHelpTaskCodeSet property here, or it will corrupt the ValueHelp dialog's list for a different row.
				const oTaskCodeListByKey = {};
				const aCombos = [...new Set(aSelectedRows.map((oRow) => `${oRow.Outkidaino001}|${oRow.Outwerks002}`))];
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
					constant.LengthCheckFieldsImport.forEach((oField) => {
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
					constant.NumberRangeCheckFields.forEach((oField) => {
						const sRaw = (oRow[oField.field] || "").toString().trim().replaceAll(",", "");
						const bIsNumeric = /^-?\d+(\.\d+)?$/.test(sRaw);
						const sLabel = this.oBundle.getText(oField.i18nKey);

						Validator._controlValidations(oRow, oField.state, oField.text, [
							{
								sValue: sRaw,
								fnCheck: () => bIsNumeric,
								sMessage: this.oBundle.getText("ERROR010", [
									constant.TypeFields.Number,
									oRow.index,
									sLabel,
								]),
								sStateMessage: this.oBundle.getText("ERROR010VALID", [constant.TypeFields.Number]),
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
						const aList = aSearchHelpData[oField.listKey] || [];
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
					const sTaskCodeValue = (oRow.Outtaskcode002 || "").toString().trim();

					const aTaskCodeList = oTaskCodeListByKey[`${oRow.Outkidaino001}|${oRow.Outwerks002}`] || [];
					const sTaskLabel = this.oBundle.getText("headerGoodsIssueTask");
					if (sTaskCodeValue) {
						Validator._controlValidations(
							oRow,
							"valueStateOuttaskcode002",
							"valueStateTextOuttaskcode002",
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
					constant.TableDateFields.forEach((oField) => {
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
									constant.TypeFields.Date,
									oRow.index,
									sLabel,
								]),
								sStateMessage: this.oBundle.getText("ERROR010VALID", [constant.TypeFields.Date]),
							},
						]).forEach((sMessage) => aMessages.push(Message.createErrorMessage(sMessage)));
					});

					// --- 4-(5): Flag value must be blank or "X" only ---
					constant.FlagCheckFields.forEach((oField) => {
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

			/* Handle compare data // No734 - add new function (hieught)  */
			handleCompareData: function (aDataTable, aDataExcel) {
				let aDisableEdit = [...constant.HiddenColumnsData, ...constant.DisableColumnsData];
				const aOrgDisableEdit = [...aDisableEdit]; // No.1527 - Store original aDisableEdit array
				const aResultCompate = [];
				const oTable = this._getTableControl();
				const aColumn = oTable.getColumns();

				const aColumnProps = aColumn
					?.filter((item) => item.getName())
					?.map((ele) => {
						return ele?.getSortProperty().replace("Sort", "") || "";
					});

				aColumnProps.push("Outrsnum001", "Outrspos001", "Outunchangeflg001", "selected", "operation");

				const arr1 = mapPingData(aDataTable);
				const arr2 = mapPingData(aDataExcel);

				for (let i = 0; i < arr1?.length; i++) {
					const currentIndex = arr1[i]["index"];
					const oMatchingItem = arr2?.find((item) => +item.index === currentIndex);

					if (oMatchingItem) {
						// No.1527 - Handle un update [購買依頼タイプ] when [引落数量] equals 0
						if (oMatchingItem.Outenmng001 !== "0" && oMatchingItem.Outenmng001 !== "0.000") {
							aDisableEdit = [...aDisableEdit, "Outbdmng001"];
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

						// compare different data No663
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
							obj["Outbdter002"] = adata["Outbdter002"]?.replace(/[^0-9]/g, "") || "";
						}
					}
					(delete obj.selected, delete obj.operation);

					return obj;
				}
			},

			_setODataTable: function (oRetrievedResult) {
				this.getView().setModel(new JSONModel(oRetrievedResult.results), "reportList");
			},

			/* handle On Press Value Help */
			onValueHelp: function (oEvent, sKey) {
				const oScreenModel = this._getScreenModel();
				const oTableModel = this._getTableModel();
				const oDataScreen = oScreenModel.getData();
				let sPreValue, sIdScreen, sNameScreen;
				// check sKey of screen
				switch (sKey) {
					case "purchase":
						sPreValue = oDataScreen?.Inbdmng001 || "";
						sIdScreen = "valueHelpPurchase";
						sNameScreen = "zpsr0010.view.ValueHelpPurchase";
						break;
					default:
						break;
				}

				if (!this._valueHelpDialogM) {
					this._valueHelpDialogM = Fragment.load({
						id: `${sIdScreen}`,
						name: `${sNameScreen}`,
						controller: this,
					}).then(
						function (oDialog) {
							this.getView().addDependent(oDialog);
							return oDialog;
						}.bind(this)
					);
				}

				this._valueHelpDialogM.then(
					function (oDialog) {
						oDialog.open();
					}.bind(this)
				);

				this._valueHelpDialogM.then(
					function (oDialog) {
						oDialog.attachCancel(function () {
							oDialog.destroy();
							this._valueHelpDialogM = null;
						}, this);

						oDialog.attachConfirm(function (oEvent) {
							const oSelectedItem = oEvent?.getParameter("selectedItem");
							const sSelectedValue = oSelectedItem.getTitle();
							if (sPreValue !== sSelectedValue) {
								switch (sKey) {
									case "purchase":
										oScreenModel.setProperty("/Inbdmng001", sSelectedValue);
										break;
									default:
										break;
								}
							}
							oDialog.destroy();
							this._valueHelpDialogM = null;
						}, this);

						oDialog.attachSearch(function (oEvent) {
							let sValue = oEvent.getParameter("value");
							const aFilter = [];
							let sCode = "Code";
							let sText = "Text";
							//hande code and text filter by case
							switch (sKey) {
								case "purchase":
									((sCode = "Werks"), (sText = "Name1"));
									break;
								default:
									break;
							}

							//multi filter  code and text
							aFilter.push(
								new Filter({
									filters: [
										new Filter(sCode, FilterOperator.Contains, sValue),
										new Filter(sText, FilterOperator.Contains, sValue),
									],
									and: false,
								})
							);
							// only filter by code or text
							// let oFilter = new Filter("Code", FilterOperator.Contains, sValue);
							let oBinding = oEvent.getParameter("itemsBinding");
							oBinding.filter(aFilter);
						}, this);
					}.bind(this)
				);
			},

			/**
			 * Column settings button event handler
			 * Initialize p13nDialog model and its opensResultValue
			 */
			onP13nDialogPress: function () {
				p13nDialogPopup.onP13nDialogPress("zpsr0010", this);
			},

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

			/* No.1527 - Handle Format Edit for [購買依頼タイプ] */
			onFormatKobairaiTypeEditable: function (flagChange, operation, iQuantity) {
				return !(flagChange || operation === "D" || iQuantity >= 1);
			},

			/* No.1527 - Handle Show test Edit for [購買依頼タイプ] */
			onShowKobairaiTypeText: function (flagChange, operation, iQuantity) {
				return flagChange || operation === "D" || iQuantity >= 1;
			},

			/* Handle check date - Update 20260212 */
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

			/* Handle clear value state - Update 20260212 */
			_clearValueState: function (aIdFields) {
				aIdFields.forEach((sId) => {
					let oControl = this.byId(sId);
					oControl.setValue("");
					oControl.setValueState("None");
				});
			},

			/* Handle chech date when press button - Update 20260212 */
			_validateInputs: function (aIdFields) {
				let bValid = true;

				aIdFields.map((sId) => {
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

			/**
			 * Handle Open or Hiden form reflection -- No1641
			 */
			onPressCollapse: function () {
				const oView = this.getView().byId("_IDGenSimpleForm");
				//get DOM class
				const sDOMClass = oView.getDomRef().classList?.value;
				if (sDOMClass.includes("displayNone")) {
					oView.removeStyleClass("displayNone");
					this.getView().byId("BulkBtn001").setText(this.oBundle.getText("btnCollpaseClose"));
				} else {
					oView.addStyleClass("displayNone");
					this.getView().byId("BulkBtn001").setText(this.oBundle.getText("btnCollpaseOpen"));
				}
			},

			/**
			 * Checkbox True when on change Field -- No1641
			 */
			onChangeFieldForm: function (oEvent) {
				const oScreenModel = this._getScreenModel();
				const sID = oEvent.getSource().getId();
				//Validation date
				if (sID.includes("BDTER003")) {
					this._checkValidDateField(oEvent);
				}
				const aFields = constant.FieldsReflection.map((obj) => obj.key);
				const sMatchedKey = aFields.find((sKey) => sID.includes(sKey));
				if (sMatchedKey) {
					oScreenModel.setProperty(`/select${sMatchedKey}`, true);
				}
			},

			/**
			 * Handle Reflection Data  -- No1641
			 */
			onPressReflection: function () {
				this._clearMessages();

				const aMessages = [];
				const oTable = this._getTableControl();
				const aRowData = this._getTableContextData(oTable);
				const oScreenModel = this._getScreenModel().getData();
				const aRowsChecked = aRowData?.filter((item) => item.selected) || [];
				const aFields = constant.FieldsReflection.map((obj) => obj.key);

				const bCheck = aFields.some((field) => oScreenModel[`select${field}`] === true);

				const _validateInputsDate = (aIdFields) => {
					return aIdFields.every((sId) => {
						const oControl = this.byId(sId);
						return oControl?.getValueState?.() !== sap.ui.core.ValueState.Error;
					});
				};

				// Raise message if no field check is on
				if (!bCheck) {
					let aMessages = [];
					const oMessage = Message.createErrorMessage(this.oBundle.getText("ERROR007"));
					aMessages.push(oMessage);
					this._resetMessages({ aMessages, oMessage });
					return;
				}

				// Raise message if no row check is on
				if (aRowsChecked.length === 0) {
					let aMessages = [];
					const oMessage = Message.createErrorMessage(this.oBundle.getText("ERROR006"));
					aMessages.push(oMessage);
					this._resetMessages({ aMessages, oMessage });
					return;
				}

				// Raise message invalid date
				if (!_validateInputsDate(["BDTER003"])) {
					let aMessages = [];
					const oMessage = Message.createErrorMessage(this.oBundle.getText("ErrorDate"));
					aMessages.push(oMessage);
					this._resetMessages({ aMessages, oMessage });
					return;
				}

				// Reflect the value
				aRowsChecked.forEach((oItem) => {
					if (oItem.Outunchangeflg001) return; // Skip unchanged rows

					constant.FieldsReflection.forEach(({ key, output }) => {
						if (!oScreenModel[`select${key}`]) return; // Skip if field not checked

						// [購買依頼タイプ] - Only reflect when 引落数量 = 0 (field is editable) - No.2003
						if (key === "BDMNG004" && parseFloat(oItem.Outenmng001) !== 0) return;

						// [保管場所] - Sync key field alongside value field - No.2005
						if (key === "LGORT003") {
							oItem["Outlgort002"] = oScreenModel[`value${key}`];
						}

						// [購買依頼タイプ] - Sync value field alongside key field - No.2162
						if (key === "BDMNG004") {
							oItem["Outbdmng001value"] = oScreenModel[`value${key}`];
						}

						// Reflect value
						oItem[output] = oScreenModel[`value${key}`];
					});

					oItem.operation = oItem.operation === "I" ? oItem.operation : "U";
				});

				this._getTableModel().refresh();
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
				const oRow = oInput.getBindingContext("reportList").getObject();
				const bCurrencyHasDecimal = false;

				// Init cursor position
				const oDomRef = oEvent.getSource().getFocusDomRef();
				let iCursorPosition = oDomRef.selectionStart;

				// If empty -> return ""
				if (!sInputValue) {
					oDomRef.onchange = this._handleOnAmountAndCurrencyChange(oRow);
					oInput.setValue("");
					oRow["Outerfmg001"] = "";
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

				oRow["Outerfmg001"] = sResultValue.replaceAll(",", "");
				oDomRef.onchange = this._handleOnAmountAndCurrencyChange(oRow);
			},

			/**
			 *  Format money on Input value
			 * @param {String} sCurrency
			 * @returns String currency formatted 123,456,789.000
			 */
			currencyInputFormatter: function (sMoney, sCurrency) {
				return Formatter.displayMoneyFormatter(sMoney, sCurrency, true, true);
			},

			// Handle formatting amount when the input loses focus
			_handleOnAmountAndCurrencyChange: function (oRow) {
				return async function () {
					// Refresh model
					this._getTableModel().refresh();
				}.bind(this);
			},
		});
	}
);
