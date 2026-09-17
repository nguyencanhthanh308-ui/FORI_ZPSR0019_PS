sap.ui.define(
	["sap/ui/base/Object", "sap/ui/model/json/JSONModel", "sap/base/util/deepExtend", "sap/ui/core/Fragment"],
	function (BaseObject, JSONModel, deepExtend, Fragment) {
		"use strict";
		return {
			/**
			 * Column settings button event handler
			 * initialize p13nDialog model and its open
			 */
			onP13nDialogPress: function (sProgramID) {
				/**
				 * initialize P13nDialog Model
				 * @returns oModel
				 */
				const fnCreateP13nDialogModel = function () {
					const oModel = new JSONModel({
						ColumnsCollection: [],
						ColumnsItems: [],
						SortCollection: [],
						SortItems: [],
						ShowResetEnabled: false,
					});
					oModel.setDefaultBindingMode("TwoWay");
					return oModel;
				};
				const oView = this.getView();
				oView.setModel(fnCreateP13nDialogModel(), "p13nDialogModel");
				const oModel = oView.getModel("p13nDialogModel");

				/**
				 * Extract and format Variant column settings
				 * @param {*} aItems
				 * @param {*} aColumnsItems
				 * @param {*} aSortItems
				 */
				const fnGetInitialP13nData = function (aItems, aColumnsItems, aSortItems) {
					// get Current table Column settings
					const aColumns = this._getTableControl().getColumns();
					const aCurrentColumnSetting = [];
					aColumns.forEach(function (oColumn, index) {
						aCurrentColumnSetting.push({
							fieldName: oColumn.getProperty("name"),
							Id: oColumn.getId(),
							index: index,
							visible: oColumn.getVisible(),
							sortOder: oColumn.getSortOrder(),
							sorted: oColumn.getSorted(),
							// Not used
							// filterValue: oColumn.getFilterValue(),
							// filtered: oColumn.getFiltered(),
							width: oColumn.getWidth(),
						});
					});

					// Record the index of the left column of the table, which does not appear in the column setting choices
					// NOTICE::The hidden indexes need to be taken into account when reflecting the settings
					this._aExcludedIndexList = [];

					// Create initial data for column setting
					aCurrentColumnSetting.map((item, index) => {
						// Exclude the checkbox column at the beginning of the column index from the settings.
						if (item.fieldName.length > 0) {
							aItems.push({
								columnKey: item.Id,
								text: item.fieldName.length > 0 ? item.fieldName : "(名称未設定)",
							});
							aColumnsItems.push({
								columnKey: item.Id,
								index: item.index,
								total: undefined,
								visible: item.visible,
								width: item.width,
							});
						} else {
							this._aExcludedIndexList.push(index);
						}
						if (item.sorted) {
							aSortItems.push({ columnKey: item.Id, operation: item.sortOder });
						}
					});
				}.bind(this);

				/**
				 * Format list data in dialog
				 */
				const fnInitP13nDialogData = function () {
					const items = [];
					const columnsItems = [];
					const sortItems = [];
					fnGetInitialP13nData(items, columnsItems, sortItems);

					oModel.setProperty("/ColumnsCollection", items);
					oModel.setProperty("/ColumnsItems", columnsItems);

					// Exclude hidden columns from sort list
					oModel.setProperty(
						"/SortCollection",
						items.filter((item) => item.text.match(/^\(.*.\)$/g) === null)
					);
					oModel.setProperty("/SortItems", sortItems);

					oModel.setProperty("/ShowResetEnabled", false);
				}.bind(this);
				fnInitP13nDialogData(this);

				// Open P13nDialog
				if (!this._oP13nDialog) {
					this._aExcludedIndexList = [];
					this._oP13nDialog = Fragment.load({
						id: "p13nDialog",
						name: `${sProgramID}.view.P13nDialog`, // NOTICE:: Please update the path according to Addon page.
						controller: this,
					}).then(
						function (oDialog) {
							const oP13nDialog = Fragment.byId("p13nDialog", "_IDGenP13nDialog");
							oView.addDependent(oP13nDialog);

							// Attach various event handlers in P13nDialog
							/**
							 * Reflect the settings in the table (processing when OK button is pressed)
							 */
							const fnReflectP13nSettings = function () {
								const oTable = this._getTableControl();
								const aSortItems = oModel.getProperty("/SortItems");
								const aColumnsItems = oModel.getProperty("/ColumnsItems");
								const aColumns = oTable.getColumns();

								this._aExcludedIndexList.forEach((index) => {
									const oColumn = aColumns[index];
									aColumnsItems.splice(index, 0, {
										columnKey: oColumn.getId(),
										index: index,
										visible: oColumn.getVisible(),
										width: oColumn.getWidth(),
										staticColumn: true,
									});
								});

								// Calculate the index of each column considering the left column of the table
								const fnCheckAddIndex = function (itemIndex, addCount = 0) {
									const staticBeforeCount = this._aExcludedIndexList.filter(
										(index) => index <= itemIndex
									).length;
									if (staticBeforeCount === addCount) {
										return staticBeforeCount;
									} else {
										return fnCheckAddIndex(itemIndex + staticBeforeCount, staticBeforeCount);
									}
								}.bind(this);

								// Columns Setting
								aColumnsItems.forEach(function (oItem) {
									const oColumn = aColumns.find(function (oColumn) {
										return oColumn.getId() === oItem.columnKey;
									});

									// reflect settings
									oColumn.setVisible(oItem.visible);
									// fireColumnMove is not working.
									// oTable.fireColumnMove({column: oColumn, newPos: oItem.index});
									if (typeof oItem.index !== "undefined") {
										const additionNumber = oItem.staticColumn ? 0 : fnCheckAddIndex(oItem.index);

										oTable.removeColumn(oColumn, true);
										oTable.insertColumn(oColumn, oItem.index + additionNumber);
									}
								}, this);

								// Sort Setting
								aColumns.forEach(function (oColumn) {
									const oItem = aSortItems.find(function (oItem) {
										return oColumn.getId() === oItem.columnKey;
									});
									if (oItem) {
										oTable.sort(oColumn, oItem.operation, true);
									} else {
										oColumn.setSorted(false);
									}
								});
							}.bind(this);

							oDialog.attachAfterClose(function () {
								oDialog.fireCancel();
							});

							oDialog.attachCancel(function () {
								oView.setModel(fnCreateP13nDialogModel(), "p13nDialogModel");
								oDialog.destroy();
								this._oP13nDialog = null;
							}, this);
							oDialog.attachOk(function () {
								const oTable = this._getTableControl();
								oTable.fireColumnMove();
								fnReflectP13nSettings();
								oDialog.destroy();
								this._oP13nDialog = null;
							}, this);
							oDialog.attachReset(function () {
								fnInitP13nDialogData(this);
							}, this);

							// Attach various event handlers in P13nColumnsPanel
							const oP13nColumnsItems = Fragment.byId("p13nDialog", "_IDGenColumnsPanel");
							/**
							 * Processing when column settings are changed
							 * @param {*} oEvent
							 */
							const fnOnChangeColumnsItems = function (oEvent) {
								/**
								 * Compare the recorded value of the Variant to see if the column settings have changed
								 */
								const fnIsChangedColumnsItems = function () {
									const fnGetArrayElementByKey = function (sKey, sValue, aArray) {
										const aElements = aArray.filter(function (oElement) {
											return oElement[sKey] !== undefined && oElement[sKey] === sValue;
										});
										return aElements.length ? aElements[0] : null;
									};
									const fnGetUnion = function (aDataBase, aData) {
										if (!aData) {
											return deepExtend([], aDataBase);
										}
										const aUnion = deepExtend([], aData);
										aDataBase.forEach(function (oMItemBase) {
											const oMItemUnion = fnGetArrayElementByKey(
												"columnKey",
												oMItemBase.columnKey,
												aUnion
											);
											if (!oMItemUnion) {
												aUnion.push(oMItemBase);
												return;
											}
											if (oMItemUnion.visible === undefined && oMItemBase.visible !== undefined) {
												oMItemUnion.visible = oMItemBase.visible;
											}
											if (oMItemUnion.width === undefined && oMItemBase.width !== undefined) {
												oMItemUnion.width = oMItemBase.width;
											}
											if (oMItemUnion.total === undefined && oMItemBase.total !== undefined) {
												oMItemUnion.total = oMItemBase.total;
											}
											if (oMItemUnion.index === undefined && oMItemBase.index !== undefined) {
												oMItemUnion.index = oMItemBase.index;
											}
										});
										return aUnion;
									};
									const fnIsEqual = function (aDataBase, aData) {
										if (!aData) {
											return true;
										}
										if (aDataBase.length !== aData.length) {
											return false;
										}
										const fnSort = function (a, b) {
											if (a.columnKey < b.columnKey) {
												return -1;
											} else if (a.columnKey > b.columnKey) {
												return 1;
											} else {
												return 0;
											}
										};
										aDataBase.sort(fnSort);
										aData.sort(fnSort);
										const aItemsNotEqual = aDataBase.filter(function (oDataBase, iIndex) {
											return (
												oDataBase.columnKey !== aData[iIndex].columnKey ||
												oDataBase.visible !== aData[iIndex].visible ||
												oDataBase.index !== aData[iIndex].index ||
												oDataBase.width !== aData[iIndex].width ||
												oDataBase.total !== aData[iIndex].total
											);
										});
										return aItemsNotEqual.length === 0;
									};

									const oModel = this.getView().getModel("p13nDialogModel");
									const aInitialColumnItems = [];
									fnGetInitialP13nData([], aInitialColumnItems, []);
									const aDataRuntime = fnGetUnion(
										aInitialColumnItems,
										oModel.getProperty("/ColumnsItems")
									);
									return !fnIsEqual(aDataRuntime, aInitialColumnItems);
								}.bind(this);

								oModel.setProperty("/ColumnItems", oEvent.getParameter("items"));
								oModel.setProperty("/ShowResetEnabled", fnIsChangedColumnsItems());
							}.bind(this);
							oP13nColumnsItems.attachChangeColumnsItems(fnOnChangeColumnsItems, this);

							// Attach various event handlers in P13nSortPanel
							const oP13nSortItems = Fragment.byId("p13nDialog", "_IDGenSortPanel");
							/**
							 * Processing when sort settings are changed
							 */
							const fnOnChangeSortItems = function (oEvent) {
								const oParameters = oEvent.getParameters();
								const oSortItem = oEvent.getParameter("sortItemData");
								const oModel = oView.getModel("p13nDialogModel");
								const aSortItems = oModel.getProperty("/SortItems");

								switch (oEvent.sId) {
									case "addSortItem":
										aSortItems.push({
											columnKey: oSortItem.mProperties.columnKey,
											operation: oSortItem.mProperties.operation,
										});
										break;
									case "removeSortItem":
										aSortItems.splice(oParameters.index, 1);
										break;
									case "updateSortItem":
										aSortItems[oParameters.index] = {
											...aSortItems[oParameters.index],
											...{
												columnKey: oSortItem.mProperties.columnKey,
												operation: oSortItem.mProperties.operation,
											},
										};
										break;
								}

								/**
								 * Compare the recorded value of the Variant to see if the sort settings have changed
								 * @param {*} aSortItems
								 */
								const fnIsChangedSortItems = function (aSortItems) {
									const aInitialSortItems = [];
									const fnIsEqual = function (aDataBase, aData) {
										if (aDataBase.length !== aData.length) {
											return false;
										}
										return !aDataBase.some((oItem, index) => {
											return (
												!aData.find((oInitialItem) => {
													return (
														oItem.mProperties.columnKey === oInitialItem.columnKey &&
														oItem.mProperties.operation === oInitialItem.operation
													);
												}) ||
												index !==
													aData.findIndex((oInitialItem) => {
														return (
															oItem.mProperties.columnKey === oInitialItem.columnKey &&
															oItem.mProperties.operation === oInitialItem.operation
														);
													})
											);
										});
									};
									fnGetInitialP13nData([], [], aInitialSortItems);
									return !fnIsEqual(aSortItems, aInitialSortItems);
								}.bind(this);

								oModel.setProperty("/SortItems", aSortItems);
								oModel.setProperty(
									"/ShowResetEnabled",
									fnIsChangedSortItems(oEvent.getSource().getAggregation("sortItems"))
								);
							}.bind(this);

							oP13nSortItems.attachAddSortItem(fnOnChangeSortItems, this);
							oP13nSortItems.attachRemoveSortItem(fnOnChangeSortItems, this);
							oP13nSortItems.attachUpdateSortItem(fnOnChangeSortItems, this);

							oDialog.open();
						}.bind(this)
					);
				}
			},
		};
	}
);
