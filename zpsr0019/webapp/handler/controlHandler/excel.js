sap.ui.define(
	["sap/ui/export/Spreadsheet", "sap/m/MessageBox", "sap/ui/export/library", "../../utils/constant"],
	function (Spreadsheet, MessageBox, exportLibrary, Constant) {
		"use strict";

		const EdmType = exportLibrary.EdmType;

		return {
			/**
			 * Handle on press download button
			 * @param {Object[]} aDataSource
			 * @param {any[]} aCols
			 * @param {Object} oFormatItems
			 * @param {string} sProgramID
			 * @returns
			 */
			handleDownloadExcel: function (aDataSource, aCols, oFormatItems, sProgramID) {
				const sMsgError = "エラー";
				const sMsgNotExits = "対象のデータが存在しません。";
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

				const oSettings = {
					workbook: {
						columns: aCols,
						hierarchyLevel: "Level",
					},
					dataSource: aCloneDataSource,
					fileName: `${sProgramID}_${this._getCurrentDate()}.xlsx`,
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
			 * Handle format data before output
			 * @param {Object[]} aDataSource
			 * @param {Object} oFormatItems
			 */
			_handleFormatDataBeforeOutput: function (aDataSource, oFormatItems) {
				const { aDateItems } = oFormatItems;

				aDataSource?.forEach((oItem) => {
					// [所要日付] "20260914" -> Date object
					aDateItems.forEach((sDateItem) => {
						if (oItem[sDateItem]?.toString()?.trim()) {
							oItem[sDateItem] = new Date(this._formatDateToYMD(oItem[sDateItem]).replaceAll("/", "-"));
						}
					});

					// [BF] boolean -> "X"
					if (typeof oItem.OUTRGEKZ === "boolean") {
						oItem.OUTRGEKZ = oItem.OUTRGEKZ ? "X" : "";
					}
				});
			},

			/**
			 * Get column config on table
			 * Uses sortProperty because numeric columns bind a parallel "<field>Sort" property
			 * @param {sap.ui.table.Table} oTable
			 * @returns {Object[]}
			 */
			createColumnConfig: function (oTable) {
				return oTable
					.getColumns()
					.filter((oCol) => oCol.getVisible() && oCol.getName())
					.map((oCol) => {
						const sProperty = oCol.getProperty("sortProperty").replace("Sort", "");
						const sLabel = oCol.getLabel()?.getText?.() || "";
						const oDefaultFormat = {
							label: sLabel,
							property: sProperty,
							width: sLabel.length * 3,
						};

						if (Constant.DateColumns.includes(sProperty)) {
							return { ...oDefaultFormat, type: EdmType.Date };
						}
						if (Constant.NumberColumns.includes(sProperty)) {
							return { ...oDefaultFormat, type: EdmType.Number, scale: 0, delimiter: true };
						}
						if (Constant.AmountColumns.includes(sProperty)) {
							return { ...oDefaultFormat, type: EdmType.Number, scale: 3, delimiter: true };
						}
						return { ...oDefaultFormat, type: EdmType.String };
					})
					.filter((oItem) => !["", "No"].includes(oItem.label));
			},

			/**
			 * Handle logic get current time
			 */
			_getCurrentDate: function () {
				const oCurrentDate = new Date();
				function pad2(n) {
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

			/**
			 * "20260914" -> "2026/09/14"
			 */
			_formatDateToYMD: function (sDate) {
				if (!sDate) {
					return "";
				}
				const sDigits = sDate.replace(/[^0-9]/g, "");
				return `${sDigits.substring(0, 4)}/${sDigits.substring(4, 6)}/${sDigits.substring(6, 8)}`;
			},
		};
	}
);