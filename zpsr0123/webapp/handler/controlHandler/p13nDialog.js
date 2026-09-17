sap.ui.define(["sap/base/util/deepClone", "sap/ui/core/Fragment"], function (DeepClone, Fragment) {
	"use strict";
	return {
		/**
		 * Column settings button event handler
		 * initialize p13nDialog model and its open
		 */
		onP13nDialogPress: function (sProgramID, oController) {
			/**
			 * Get init table config data
			 * @param {sap.ui.Table.Table} oTable
			 * @returns
			 */
			const fnGetTableColumnConfig = function (oTable) {
				// get Current table Column settings
				const aColumns = oTable.getColumns();
				const aSortedColumns = oTable.getSortedColumns();

				const aSelectionPanels = [];
				let aSortPanels = [];

				// Get selection panel data
				aColumns.forEach((oColumn) => {
					const oLabel = oColumn.getLabel();
					let label = oLabel?.getText?.();
					if (!label) {
						const aItems = oLabel?.getItems() || [];
						const oChildLabel = aItems.find((oItem) => oItem instanceof sap.m.Label);
						if (!oChildLabel) {
							return;
						}
						label = oChildLabel?.getText?.();
					}
					const name = oColumn.getProperty("name");
					const visible = oColumn.getVisible();
					const sorted = oColumn.getSorted();
					const descending = oColumn.getSortOrder() === "Descending";
					aSelectionPanels.push({
						label,
						name,
						visible,
					});
					// Get non-sorted items
					if (!sorted) {
						aSortPanels.push({
							sorted,
							label,
							name,
							descending,
						});
					}
				});

				// Get sorted items
				const aSortColumnsConfig = aSortedColumns.map((oColumn) => {
					const oLabel = oColumn.getLabel();
					let label = oLabel?.getText?.();
					if (!label) {
						const aItems = oLabel?.getItems() || [];
						const oChildLabel = aItems.find((oItem) => oItem instanceof sap.m.Label);
						if (!oChildLabel) {
							return;
						}
						label = oChildLabel?.getText?.();
					}
					if (!label) return;
					const name = oColumn.getProperty("name");
					const sorted = oColumn.getSorted();
					const descending = oColumn.getSortOrder() === "Descending";
					return {
						sorted,
						label,
						name,
						descending,
					};
				});
				aSortPanels = [...aSortColumnsConfig, ...aSortPanels];
				return { aSelectionPanels, aSortPanels };
			};

			/**
			 * Set p13n data by table data
			 * @param {sap.m.p13n.Popup} oTable
			 * @returns
			 */
			const fnSetP13nByTableData = function (oDialog) {
				const oTable = oController._getTableControl();
				const { aSelectionPanels, aSortPanels } = fnGetTableColumnConfig(oTable);
				const aPanels = oDialog.getPanels();
				const oSelectionPanel = aPanels.find((oPanel) => oPanel.isA("sap.m.p13n.SelectionPanel"));
				const oSortPanel = aPanels.find((oPanel) => oPanel.isA("sap.m.p13n.SortPanel"));
				oSelectionPanel.setP13nData(aSelectionPanels);
				oSortPanel.setP13nData(aSortPanels);
				const oResult = { aSelectionPanels, aSortPanels };
				return DeepClone(oResult);
			};

			if (!oController._oDialog) {
				oController._oP13nDialog = Fragment.load({
					id: "p13nDialog" + Date.now(),
					name: `${sProgramID}.view.P13nDialog`,
					controller: oController,
				}).then(function (oDialog) {
					oController._oDialog = oDialog;
					oController.getView().addDependent(oDialog);
					oController._currentTableData = fnSetP13nByTableData(oController._oDialog);

					// Attached close popup control
					oDialog.attachClose(function (oEvent) {
						const oParamerters = oEvent.getParameters();
						// Apply changes to table
						if (oParamerters.reason === "Ok") {
							const oTable = oController._getTableControl();
							const aColumn = oTable.getColumns();
							const oSource = oEvent.getSource();
							const aPanels = oSource.getPanels();
							const oSelectionPanel = aPanels.find((oPanel) => oPanel.isA("sap.m.p13n.SelectionPanel"));
							const oSortPanel = aPanels.find((oPanel) => oPanel.isA("sap.m.p13n.SortPanel"));
							const aSelectPanelData = oSelectionPanel.getP13nData();
							const aSortPanelData = oSortPanel.getP13nData();
							oTable.sort();

							// Reflect selection panel data to table
							aSelectPanelData.forEach((oItem, index) => {
								const oMatchingColumn = aColumn.find((oColumn) => {
									const oLabel = oColumn.getLabel();
									let label = oLabel?.getText?.();
									if (!label) {
										const aItems = oLabel?.getItems() || [];
										const oChildLabel = aItems.find((oItem) => oItem instanceof sap.m.Label);
										if (!oChildLabel) {
											return;
										}
										label = oChildLabel?.getText?.();
									}
									return label === oItem.label;
								});

								oMatchingColumn.setVisible(oItem.visible);
								oTable.removeColumn(oMatchingColumn);
								oTable.insertColumn(oMatchingColumn, index);
							});

							// Keep checkbox column first table
							const oCheckBoxColumn = aColumn.find((oColumn) => !oColumn.getLabel()?.getText?.());
							if (oCheckBoxColumn) {
								const oCustomData = oCheckBoxColumn.getTemplate()?.getCustomData();
								if (oCustomData.length) {
									oTable.removeColumn(oCheckBoxColumn);
									oTable.insertColumn(oCheckBoxColumn, 0);
								}
							}
							// Reflect sort panel data to table
							aSortPanelData.forEach((oItem) => {
								const oMatchingColumn = aColumn.find((oColumn) => {
									const oLabel = oColumn.getLabel();
									let label = oLabel?.getText?.();
									if (!label) {
										const aItems = oLabel?.getItems() || [];
										const oChildLabel = aItems.find((oItem) => oItem instanceof sap.m.Label);
										if (!oChildLabel) {
											return;
										}
										label = oChildLabel?.getText?.();
									}
									return label === oItem.label;
								});
								if (oItem.sorted) {
									oTable.sort(oMatchingColumn, oItem.descending ? "Descending" : "Ascending", true);
								}
							});

							// Apply variant changes
							oTable.fireColumnMove();
						}
					}, oController);

					// Set call back reset button
					oDialog.setReset(function () {
						const { aSelectionPanels, aSortPanels } = oController._currentTableData;
						const aPanels = oDialog.getPanels();
						const oSelectionPanel = aPanels.find((oPanel) => oPanel.isA("sap.m.p13n.SelectionPanel"));
						const oSortPanel = aPanels.find((oPanel) => oPanel.isA("sap.m.p13n.SortPanel"));
						oSelectionPanel.setP13nData(aSelectionPanels);
						oSortPanel.setP13nData(aSortPanels);
					});
					// Setup warning Reset Text
					oDialog.setWarningText("項目およびソートの設定をすべて初期状態に戻します。\n続行しますか？");
					oDialog.open();
				});
			} else {
				oController._currentTableData = fnSetP13nByTableData(oController._oDialog);
				oController._oDialog.open();
			}
		},
	};
});
