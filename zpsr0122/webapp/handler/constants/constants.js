sap.ui.define([], function () {
	"use strict";

	return {
		PROGRAM_ID: "zpsr0122",
		MAIN_TABLE_MODEL_NAME: "oDataTable",
		MAIN_PATH: "MachineNoSet",
		EXEC_MODE: "EXEC_MODE",
		TABLE_DATE_PROPERTIES: [
			"outusr09",
			"outku_ntanf",
			"outztokushushiyotorokubi",
			"outaudat",
			"outedatu",
			"outntend",
			"outsh_ntanf",
		],
		TABLE_DATE_LABELS: [
			"組立可能日",
			"組立開始日",
			"特殊仕様登録日",
			"受注日",
			"納入日",
			"完成予定日",
			"出荷予定日",
		],
		TABLE_AMOUNT_LABELS: [],
		TABLE_AMOUNT_PROPERTIES: [],
		TABLE_NUMBER_LABELS: ["錘数"],
		TABLE_NUMBER_PROPERTIES: ["outzesuisu"],
	};
});
