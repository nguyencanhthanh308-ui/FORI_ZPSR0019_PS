sap.ui.define([], function () {
	"use strict";

	return {
		PROGRAM_ID: "zpsr0113",
		MAIN_TABLE_MODEL_NAME: "oDataTable",
		MAIN_PATH: "searchSet",
		UPDATE_PATH: "registerSet",
		IMPORT_EXCEL_PATH: "importExcelSet",

		TABLE_AMOUNT_LABELS: ["受注金額"],

		TABLE_AMOUNT_PROPERTIES: ["OUTKBETR"],

		TABLE_NUMBER_LABELS: ["号機", "明細番号", "出荷指示数量"],

		TABLE_NUMBER_PROPERTIES: ["OUTZGOKINO", "OUTZPOSNR", "OUTZPLANDELNUM"],

		TABLE_DATE_LABELS: ["出荷日", "出荷指示日", "出荷可能日", "出荷予定日", "納入予定日"],

		TABLE_DATE_PROPERTIES: [
			"OUTZACTDELDATE",
			"OUTZPLANDELDATE",
			"OUTUSR08",
			"OUTAFVV_0020_NTANF",
			"OUTAFVV_0040_NTANF",
		],

		REQUIRED_COLUMNS: { OUTZACTDELDATE: ["出荷日", "ShippingDate"] },
	};
});
