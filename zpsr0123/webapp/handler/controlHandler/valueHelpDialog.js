sap.ui.define(
	["sap/ui/model/Filter", "sap/ui/model/FilterOperator", "sap/ui/core/Fragment"],
	function (Filter, FilterOperator, Fragment) {
		"use strict";

		/**
		 * Handle bind item to dialog
		 * @param {sap.m.SelectDialog} oSelectDialog
		 * @param {String} title
		 * @param {String} sModelName
		 * @param {String} sCode
		 * @param {String} sValue
		 */
		const _getDataToValueHelp = function (oSelectDialog, sTitle, sModelName, sCode, sValue, bIsMultiSelect) {
			oSelectDialog.setTitle(sTitle);
			oSelectDialog.setMultiSelect(bIsMultiSelect);
			oSelectDialog.bindAggregation("items", {
				path: sModelName + ">/",
				template: new sap.m.StandardListItem({
					title: `{${sModelName}>${sCode}}`,
					description: `{${sModelName}>${sValue}}`,
					type: "Active",
				}),
			});
		};
		return {
			/**
			 * Handle open value help dialog
			 * @param {sap.m.Input} oControl
			 * @param {String} sProgramId
			 * @param {String} sTitle
			 * @param {String} sModelName
			 * @param {String} sKey1
			 * @param {String} sKey2
			 */
			onValueHelpRequest: function (oControl, sProgramId, bIsMultiSelect) {
				const oScreenModel = this._getScreenModel();
				const oSuggestionItemBinding = oControl.getBindingInfo("suggestionItems");
				const oFactory = oSuggestionItemBinding.factory();
				const sKey1 = oFactory.getBindingInfo("text").parts[0].path;
				const sKey2 = oFactory.getBindingInfo("additionalText").parts[0].path;
				const sName = oControl.getName();
				const sModelName = oSuggestionItemBinding.model;
				const sTitle = this.oBundle.getText(`filter${sName}`);

				if (!this._valueHelpDialog) {
					this._valueHelpDialog = Fragment.load({
						id: "valueHelpDialog",
						name: `${sProgramId}.view.ValueHelpDialog`,
						controller: this,
					}).then(
						function (oDialog) {
							// Get the SelectDialog object from the fragment
							const oSelectDialog = Fragment.byId("valueHelpDialog", "_IDGenSelectDialog1");
							this.getView().addDependent(oDialog);
							_getDataToValueHelp(oSelectDialog, sTitle, sModelName, sKey1, sKey2, bIsMultiSelect);
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
							if (bIsMultiSelect) {
								const oSelectedItems = oEvent.getParameter("selectedItems");
								if (oSelectedItems.length) {
									const aItems = oSelectedItems.map((oToken) => {
										const oItems = {
											key: oToken.getTitle(),
											text: oToken.getTitle(),
										};
										return oItems;
									});
									oScreenModel.setProperty(`/${sName}`, aItems);
								} else {
									oScreenModel.setProperty(`/${sName}`, []);
								}
							} else {
								const oSelectedItem = oEvent.getParameter("selectedItem");
								if (oSelectedItem) {
									const sSelectedValue = oSelectedItem.getTitle();
									oControl.setValue(sSelectedValue);
									oControl.fireChange();
								}
							}
							oDialog.destroy();
							this._valueHelpDialog = null;
						}, this);
						oDialog.attachSearch(function (oEvent) {
							const sValue = oEvent.getParameter("value");
							const aFilter = [];
							if (sValue) {
								aFilter.push(
									new Filter({
										filters: [
											new Filter(sKey1, FilterOperator.Contains, sValue),
											new Filter(sKey2, FilterOperator.Contains, sValue),
										],
										and: false,
									})
								);
							}
							const oBinding = oEvent.getParameter("itemsBinding");
							oBinding.filter(aFilter);
						}, this);
					}.bind(this)
				);
			},

			/**
			 *	Handle open multi value help request
			 * @param {sap.ui.core.Control} oControl
			 * @param {Object} oParameter
			 */
			onMultiValueHelpRequest: function (
				sProgramId,
				oControl,
				sTitle,
				oColumns,
				aFilters = [],
				aSupportRangeOnly = []
			) {
				const oScreenModel = this._getScreenModel();

				const oSuggestionItemBinding = oControl.getBindingInfo("suggestionItems");
				const oFactory = oSuggestionItemBinding.factory();

				const sKey1 = oFactory.getBindingInfo("text").parts[0].path;
				const sKey2 = oFactory.getBindingInfo("additionalText").parts[0].path;
				const sName = oControl.getName();
				const sModelName = oSuggestionItemBinding.model;
				const bIsMultiSelect = !!oControl.getTokens;
				const iMaxLength = oControl.getMaxLength();
				const bSupportRangeOnly = aSupportRangeOnly.includes(sName);

				if (!sName) {
					throw new Error("Please setting property name for control!");
				}

				if (!Object.keys(oColumns).length && !bSupportRangeOnly) {
					throw new Error("Please setting the configuration for columns!");
				}

				const aColumnName = Object.keys(oColumns);
				const aTableProperties = Object.values(oColumns);

				// Initial dialog
				const oSearchFieldControl = new sap.m.SearchField();
				if (!this._pMultipleConditionsDialog) {
					this._pMultipleConditionsDialog = new sap.ui.core.Fragment.load({
						id: "valueHelpDialog",
						name: `${sProgramId}.view.ValueHelpDialogMultipleConditions`,
						controller: this,
					});
				}
				this._pMultipleConditionsDialog.then(
					function (oMultipleConditionsDialog) {
						this.getView().addDependent(oMultipleConditionsDialog);
						if (bIsMultiSelect) {
							const aSavedData = oScreenModel.getProperty(`/${sName}`) || [];
							const aTokens = aSavedData.map((oItem) => {
								const { key, text, range } = oItem;
								const oToken = new sap.m.Token({ key, text });

								// Attach range information back to the token
								oToken.data("range", {
									exclude: range?.exclude ?? false,
									operation: range?.operation ?? "EQ",
									keyField: sKey1,
									value1: range ? range.value1 : key,
									value2: range?.value2 ?? "",
								});

								return oToken;
							});
							oMultipleConditionsDialog.setTokens(aTokens);
						}
						oMultipleConditionsDialog.setTitle(sTitle);
						oMultipleConditionsDialog.setSupportRanges(bIsMultiSelect);
						oMultipleConditionsDialog.setSupportRangesOnly(bSupportRangeOnly && bIsMultiSelect);
						oMultipleConditionsDialog.setKey(sKey1);
						oMultipleConditionsDialog.setDescriptionKey(sKey2);

						const aDefaultRangeKeyFields = [
							{
								key: sKey1,
								maxLength: iMaxLength,
							},
						];

						oMultipleConditionsDialog.setRangeKeyFields(aDefaultRangeKeyFields);
						const aRangeOperations = ["EQ", "Contains", "BT", "LT", "LE", "GT", "GE"];

						oMultipleConditionsDialog.setIncludeRangeOperations(aRangeOperations);
						oMultipleConditionsDialog.setExcludeRangeOperations(aRangeOperations);

						// Init view in filterbar
						const oFilterBar = oMultipleConditionsDialog.getFilterBar();
						oFilterBar.setFilterBarExpanded(false);
						oFilterBar.setBasicSearch(oSearchFieldControl);
						oSearchFieldControl.attachSearch(
							function (oEvent) {
								const sSearchValue = oEvent.getParameter("query");
								const aFilter = [];
								if (sSearchValue) {
									const aFilters = aTableProperties.map((sItem) => {
										return new Filter(sItem, FilterOperator.Contains, sSearchValue);
									});
									aFilter.push(
										new Filter({
											filters: [...aFilters],
											and: false,
										})
									);
								}
								oMultipleConditionsDialog.getTableAsync().then(
									function (oTable) {
										if (oTable.bindRows) {
											if (!this._oCurrentFilter) {
												this._oCurrentFilter = oTable.getBinding("rows").aFilters;
											}
											oTable.getBinding("rows").filter([...this._oCurrentFilter, ...aFilter]);
										}
									}.bind(this)
								);
							}.bind(this)
						);
						// Init table view on search help
						const oModel = this.getView().getModel(sModelName);
						oMultipleConditionsDialog.getTableAsync().then(
							function (oTable) {
								// Fix: SAP bugs redirect conditions tab remove current table filter
								oTable.attachRowsUpdated(function () {
									const aFiltersBinding = oTable.getBinding("rows").aFilters;
									if (aFilters.length && !aFiltersBinding.length) {
										oTable.getBinding("rows").filter(aFilters);
									}
								});

								oTable.setModel(oModel);
								if (!bIsMultiSelect) {
									oTable.setSelectionMode("Single");
								}
								if (oTable.bindRows) {
									// Bind rows to the ODataModel and add columns
									oTable.bindAggregation("rows", {
										path: "/",
										model: `${sModelName}`,
										events: {
											dataReceived: function () {
												oMultipleConditionsDialog.update();
											},
										},
									});
									aTableProperties.forEach((sTableProperties, index) => {
										oTable.addColumn(
											new sap.ui.table.Column({
												label: this.oBundle.getText("help" + aColumnName[index]),
												template: new sap.m.Text({
													text: `{${sModelName}>${sTableProperties}}`,
													maxLines: 1,
													tooltip: `{${sModelName}>${sTableProperties}}`,
												}),
											})
										);
									});
									if (aFilters.length) {
										oTable.getBinding("rows").filter(aFilters);
									}
								}
								oMultipleConditionsDialog.update();
							}.bind(this)
						);

						oMultipleConditionsDialog.attachOk(
							function (oEvent) {
								const aTokens = oEvent.getParameter("tokens");
								if (bIsMultiSelect) {
									const aScreenToken = aTokens.map((oToken) => {
										const oRangeData = oToken.data();
										const oTokens = {
											key: oToken.getKey(),
											text: oToken.getText(),
										};
										if (oRangeData) {
											oTokens.range = oRangeData.range;
										}
										return oTokens;
									});

									oScreenModel.setProperty(`/${sName}`, aScreenToken);
								} else {
									if (aTokens) {
										oControl.setValue(aTokens[0]?.getKey() || "");
									}
								}
								oMultipleConditionsDialog.close();
							}.bind(this)
						);

						oMultipleConditionsDialog.attachCancel(
							function () {
								oMultipleConditionsDialog.close();
							}.bind(this)
						);

						oMultipleConditionsDialog.attachAfterClose(
							function () {
								oMultipleConditionsDialog.close();
								delete this._oCurrentFilter;
								this._pMultipleConditionsDialog = null;
								oMultipleConditionsDialog.destroy();
								oMultipleConditionsDialog.fireCancel();
							}.bind(this)
						);
						oMultipleConditionsDialog.open();
					}.bind(this)
				);
			},
		};
	}
);
