sap.ui.define(
	[
		"sap/ui/export/Spreadsheet",
		"sap/m/MessageBox",
		"sap/ui/export/library",
		"../formatter/formatter",
		"../../libs/Constant",
	],
	function (Spreadsheet, MessageBox, exportLibrary, Formatter, Constant) {
		"use strict";

		const EdmType = exportLibrary.EdmType;
		const oBundle = new sap.ui.model.resource.ResourceModel({
			bundleName: "zpsr0113.i18n.i18n",
		}).getResourceBundle();
		return {
			/**
			 * Handle on press download button
			 * @param {Object} aDataSource
			 * @param {any[]} aCols
			 * @param {Object} oFormatItems
			 * @returns
			 */
			handleDownloadExcel: function (aDataSource, aCols, oFormatItems, sProgramID) {
				const sMsgError = oBundle.getText("ErrorTitle");
				const sMsgNotExits = oBundle.getText("ErrorNoDataText");
				if (aDataSource.length === 0) {
					return MessageBox.show(sMsgNotExits, {
						icon: MessageBox.Icon.ERROR,
						title: sMsgError,
						description: sMsgNotExits,
						subtitle: sMsgError,
					});
				}

				const aCloneDataSource = JSON.parse(JSON.stringify(aDataSource));
				this._handleFormatDataBeforeOutput(aCloneDataSource, oFormatItems);

				// Getting whole data from model
				const oSettings = {
					workbook: {
						columns: aCols,
						hierarchyLevel: "Level",
					},
					dataSource: aCloneDataSource,
					fileName: `${sProgramID}_${this._getCurrentDate()}.xlsx`,
					worker: true,
				};
				// Creating spreadsheet
				const oSheet = new Spreadsheet(oSettings);
				oSheet
					.build()
					.then(function () {
						//Message Toast.show("Spreadsheet export has finished);
					})
					.finally(function () {
						oSheet.destroy();
					});
			},

			/**
			 * Handle format data before output
			 * @param {} aDataSource
			 * @param {Object} oFormatItems
			 */
			_handleFormatDataBeforeOutput: function (aDataSource, oFormatItems) {
				const { aNumberItems, aAmountItems, aDateItems } = oFormatItems;
				aDataSource?.forEach((oItem) => {
					// Format date items
					aDateItems.forEach((sDateItem) => {
						if (oItem[sDateItem]?.toString()?.trim()) {
							oItem[sDateItem] = Formatter.dateFormatter(oItem[sDateItem]?.replaceAll("-", "/"));
						}
					});

					// Format number items
					aNumberItems?.forEach((sNumberItem) => {
						if (oItem[sNumberItem]?.toString()?.trim()) {
							oItem[sNumberItem] = Formatter.displayMoneyFormatter(
								oItem[sNumberItem]?.toString() || "",
								"USD",
								false,
								true,
								0
							);
						}
					});

					// Format amount items
					aAmountItems?.forEach((sAmountItem) => {
						if (oItem[sAmountItem]?.toString()?.trim()) {
							oItem[sAmountItem] = Formatter.displayMoneyFormatter(
								oItem[sAmountItem]?.toString(),
								"JPY",
								false,
								true
							);
						}
					});
				});
			},

			/**
			 * get column config on table
			 * @param {sap.ui.table.Table} oTable
			 * @param {object} oSpecialItems
			 * @returns
			 */
			createColumnConfig: function (oTable, oSpecialItems) {
				const aColumns = oTable.getColumns();
				const { aNumberItems, aAmountItems, aDateItems } = oSpecialItems;

				// Init column properties
				const aResultColumns = aColumns
					.map((oItem) => {
						const oItemBinding = oItem?.getTemplate?.().getItems?.()?.[0] || oItem?.getTemplate();
						const oBinding =
							oItemBinding.getBindingInfo("text") ||
							oItemBinding.getBindingInfo("value") ||
							oItemBinding.getBindingInfo("selected") ||
							oItemBinding.getBindingInfo("selectedKey");
						const label = oItem.getLabel?.()?.getText ? oItem.getLabel?.().getText?.().trim() : "";
						const property = oBinding ? oBinding.parts[0].path : "";
						const oDefaultFormat = {
							label,
							property,
							width: label.length * 3,
						};
						// Format Number
						if (aNumberItems.includes(label)) {
							return {
								...oDefaultFormat,
								type: EdmType.Number,
								delimiter: true,
								scale: 0,
							};
						}

						// Format Amount Items
						if (aAmountItems.includes(label)) {
							return {
								...oDefaultFormat,
								type: EdmType.Number,
								scale: 2,
								delimiter: true,
							};
						}

						// Format Date
						if (aDateItems.includes(label)) {
							return {
								...oDefaultFormat,
								type: EdmType.Date,
								format: "yyyy/mm/dd",
							};
						}

						// Default format
						return {
							...oDefaultFormat,
							type: EdmType.String,
						};
					})
					.filter((sItem) => ![""].includes(sItem.label));
				return aResultColumns;
			},

			/**
			 * Handle logic get current time
			 */
			_getCurrentDate: function () {
				const oCurrentDate = new Date();
				function pad2(n) {
					// always returns a string
					return (n < 10 ? "0" : "") + n;
				}
				return (
					oCurrentDate.getFullYear() +
					pad2(oCurrentDate.getMonth() + 1) +
					pad2(oCurrentDate.getDate()) +
					pad2(oCurrentDate.getHours()) +
					pad2(oCurrentDate.getMinutes()) +
					pad2(oCurrentDate.getSeconds())
				);
			},
		};
	}
);
