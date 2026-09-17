sap.ui.define(
	["sap/ui/export/Spreadsheet", "sap/m/MessageBox", "sap/ui/export/library", "./constant"],
	/**
	 * provide app-view type models (as in the first "V" in MVVC)
	 *
	 * @param {typeof sap.ui.model.json.JSONModel} JSONModel
	 * @param {typeof sap.ui.Device} Device
	 *
	 * @returns {Function} createDeviceModel() for providing runtime info for the device the UI5 app is running on
	 */
	function (Spreadsheet, MessageBox, exportLibrary, Constant) {
		"use strict";

		var EdmType = exportLibrary.EdmType;
		return {
			/**
			 * Handle export file excel
			 * @param {*} oTable
			 * @param {*} oBundle
			 * @param {*} fileName
			 */
			handleExportFile: function (oTable, oBundle, fileName, oView) {
				// Get the binding for table rows
				const oRowBinding = oTable.getBinding("rows");
				// Get the indices of the bound rows
				const aIndices = oRowBinding.aIndices;
				// Get the list of bound rows
				const oList = oRowBinding.oList;
				// Create an array of data based on the row indices
				const oDataTable = [];
				aIndices.forEach((id) => {
					oDataTable.push(oList[id]);
				});

				const aNewData = oDataTable.map((item) => ({ ...item }));

				aNewData?.forEach((item) => {
					const keys = Object.keys(item);

					keys.forEach((key) => {
						if (Constant.DateColumns.includes(key)) {
							item[key] = item[key]
								? new Date(this._formatDateToYMD(item[key]).replaceAll("/", "-"))
								: "";
						}
						if (key === "OUTRGEKZ") {
							item[key] = item[key] === true ? "X" : "";
						}
					});
				});
				// Define the export settings
				const aCols = this._createColumnConfig(oTable);

				// Generate file name
				const sFileName = `${fileName}_${this._getCurrentDate()}`;

				const oSettings = {
					workbook: {
						columns: aCols,
						hierarchyLevel: "Level",
					},
					dataSource: aNewData,
					fileName: sFileName,
					worker: true,
				};

				if (oSettings.dataSource.length > 0) {
					// Creating spreadsheet
					const oSheet = new Spreadsheet(oSettings);
					oSheet
						.build()
						.then(function () {})
						.finally(function () {
							oSheet.destroy();
						});
				} else {
					// Show an error message if there is no data to export
					MessageBox.show(oBundle.getText("ErrorExport"), {
						icon: MessageBox.Icon.ERROR,
						title: oBundle.getText("ErrorTitle"),
						description: oBundle.getText("ErrorExport"),
						subtitle: oBundle.getText("ErrorTitle"),
					});
				}
			},

			/**
			 * Get columns in the table
			 */
			_createColumnConfig: function (oTable) {
				const aPropertyData = [];
				const aPropertyLabel = [];
				const aTableColumns = oTable.getColumns();
				const aCurrentShowColumns = aTableColumns.filter(
					(oColumn) => oColumn.getVisible() && oColumn.getName()
				);
				for (let i = 0; i < aCurrentShowColumns.length; i++) {
					const sPath = aCurrentShowColumns[i].getProperty("sortProperty").replace("Sort", "");
					aPropertyData.push(sPath);
					aPropertyLabel.push(aCurrentShowColumns[i].getLabel()?.getText());
				}
				const columnProperties = [];
				for (let i = 0; i < aPropertyLabel.length; i++) {
					const property = aPropertyData[i];
					let obj = {
						label: aPropertyLabel[i],
						property: property,
						type: EdmType.String,
					};

					if (Constant.DateColumns.includes(property)) {
						obj.type = EdmType.Date;
					}

					// Format Number Items
					if (Constant.NumberColumns.includes(property)) {
						obj.type = EdmType.Number;
						((obj.scale = 0), (obj.delimiter = true));
					}

					// Format Amount Items
					if (Constant.AmountColumns.includes(property)) {
						obj.type = EdmType.Number;
						((obj.scale = 3), (obj.delimiter = true));
					}

					columnProperties.push(obj);
				}
				return columnProperties;
			},

			/**
			 * handle get datetime
			 * @returns dateTime
			 */
			_getCurrentDate() {
				const today = new Date();
				const month = (today.getMonth() + 1).toString().padStart(2, "0");
				const day = today.getDate().toString().padStart(2, "0");
				const hours = today.getHours().toString().padStart(2, "0");
				const minutes = today.getMinutes().toString().padStart(2, "0");
				const seconds = today.getSeconds().toString().padStart(2, "0");
				const date = `${today.getFullYear()}${month}${day}`; //get date
				const time = `${hours}${minutes}${seconds} `; //get time
				return `${date}${time}`;
			},

			_formatDateToYMD: function (sDate) {
				if (sDate) {
					const date = sDate.replace(/[^0-9]/g, "");

					const year = date.substring(0, 4);
					const month = date.substring(4, 6);
					const day = date.substring(6, 8);
					const formattedDate = `${year}/${month}/${day}`;

					return formattedDate;
				} else {
					return "";
				}
			},

			getFullDate(dDate) {
				if (dDate) {
					let date = dDate.replace(/[^0-9]/g, "-");

					let sDate = new Date(date);
					// Extract year, month, and day from the Date object
					const year = sDate.getFullYear();
					const month = String(sDate.getMonth() + 1).padStart(2, "0"); // Adding 1 to month since it's zero-based
					const day = String(sDate.getDate()).padStart(2, "0");
					// Formatted date in "YYYY/MM/DD" format
					const formattedDate = `${year}/${month}/${day}`;
					return formattedDate;
				} else {
					return "";
				}
			},

			getFullDateFromNewDate(dDate) {
				let sDate = new Date(dDate);
				// Extract year, month, and day from the Date object
				const year = sDate.getFullYear();
				const month = String(sDate.getMonth() + 1).padStart(2, "0"); // Adding 1 to month since it's zero-based
				const day = String(sDate.getDate()).padStart(2, "0");
				// Formatted date in "YYYY/MM/DD" format
				const formattedDate = `${year}-${month}-${day}`;
				return formattedDate;
			},
		};
	}
);
