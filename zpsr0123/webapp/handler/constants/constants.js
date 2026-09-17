sap.ui.define([], function () {
	"use strict";

	return {
		PROGRAM_ID: "zpsr0123",
		MAIN_TABLE_MODEL_NAME: "oDataTable",
		MAIN_PATH: "MachineInfoSet",

		TABLE_DATE_LABELS: [
			"出荷可能日",
			"搬入可能日",
			"開始予定",
			"完了予定",
			"出荷予定",
			"搬入予定",
			"搬入確定",
			"開始予定",
			"完了予定",
			"出荷予定",
			"搬入予定",
			"出荷可能日",
			"搬入確定",
			"搬入可能日",
		],
		TABLE_DATE_PROPERTIES: [
			"outsh_usr08",
			"outha_usr08",
			"outku_ntanf",
			"outku_ntend",
			"outsh_ntanf",
			"outno_ntanf",
			"outha_ntanf",
			"outpa_ku_ntanf",
			"outpa_ku_ntend",
			"outpa_sh_ntanf",
			"outpa_no_ntanf",
			"outpa_sh_usr08",
			"outpa_ha_ntanf",
			"outpa_ha_usr08",
		],
		TABLE_NUMBER_LABELS: ["錘数", "作業手順番号（出荷）", "作業手順番号（搬入）"],
		TABLE_NUMBER_PROPERTIES: ["outzsuisu", "outsh_aufpl", "outdo_aufpl"],
		TABLE_AMOUNT_LABELS: [],
		TABLE_AMOUNT_PROPERTIES: [],

		TABLE_ITEMS_PROPERTIES: [
			"outsh_usr08", // [出荷可能日]
			"outha_usr08", // [搬入可能日]
			"outz_kidai_no", // [機台NO]
			"outsub", // [サブ]
			"outz_logic_kishu", // [ロジック機種]
			"outusr00", // [組番]
			"outusr01", // [優先NO]
			"outzsuisu", // [錘数]
			"outkunnr", // [納入先]
			"outname", // [納入先名称]
			"outku_ntanf", // [開始予定]
			"outku_ntend", // [完了予定]
			"outsh_ntanf", // [出荷予定]
			"outno_ntanf", // [搬入予定]
			"outha_ntanf", // [搬入確定]
			"outoyashireigoki", // [受注親機台NO]
			"outpa_ku_ntanf", // [開始予定]
			"outpa_ku_ntend", // [完了予定]
			"outpa_sh_ntanf", // [出荷予定]
			"outpa_no_ntanf", // [搬入予定]
			"outpa_sh_usr08", // [出荷可能日]
			"outpa_ha_ntanf", // [搬入確定]
			"outtline", // [記事欄]
			"outpa_kunnr", // [納入先]
			"outpa_ha_usr08", // [搬入可能日]
			"outpa_zshimukechi", // [国]
			"outerror_message", // [エラーメッセージ]
			"outaufnr", // [指図番号]
			"outsh_vornr", // [活動（出荷）]
			"outsh_aufpl", // [作業手順番号（出荷）]
			"outsh_objnr", // [対象番号（出荷）]
			"outdo_vornr", // [活動（搬入）]
			"outdo_aufpl", // [作業手順番号（搬入）]
			"outdo_objnr", // [対象番号（搬入）]
		],
	};
});
