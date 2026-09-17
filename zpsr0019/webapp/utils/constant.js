sap.ui.define([], function () {
	"use strict";

	return {
		PROGRAM_ID: "zpsr0019",
		MAIN_PATH: "ComponentItemSchListSet",
		MAIN_TABLE_MODEL_NAME: "oDataTable",

		UsageGuideTitle: "凡例",
		XLSXType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

		HiddenColumns: ["(編集不可フラグ)", "(入出庫予定)", "(明細番号)"],

		HiddenColumnsData: ["Outunchangeflg001", "OUTRSNUM", "OUTRSPOS"],

		DisableColumns: [
			"No",
			"出庫指示状況",
			"機台NO",
			"要求NO",
			"組計状況",
			"品目コード",
			"プラント",
			"品目テキスト",
			"所要数量",
			"基本単位",
			"引当数量",
			"引落数量",
			"出庫完了フラグ",
			"ポジション",
			"PL",
			"親品番",
			"補助品番",
			"処理NO",
			"実出庫NO",
			"M",
			"入出庫予定番号",
			"入出庫予定明細番号",
			"BOM明細番号",
		],

		DisableColumnsData: [
			"index",
			"OUTZ_SHUKKO_JOUKYOU",
			"OUTZ_KIDAI_NO",
			"OUTUSR02",
			"OUTTXT30",
			"OUTMATNR",
			"OUTWERKS",
			"OUTMAKTX",
			"OUTBDMNG", // [所要数量]
			"OUTMEINS", // [基本単位]
			"OUTHIKIATESUYO", // [引当数量]
			"OUTENMNG", // [引落数量]
			"OUTKZEAR",
			"OUTZ_POSITION_NO",
			"OUTZ_PLNO",
			"OUTZ_OYA_HINBAN",
			"OUTZ_HOJO_HINBAN",
			"OUTZ_SHORI_NO",
			"OUTZ_JITSUSHUKKO_NO",
			"OUTKZMPF",
			"OUTRSNUM",
			"OUTRSPOS",
			"OUTPOSNR",
		],

		DateColumns: ["OUTBDTER"],

		NumberColumns: [
			"OUTERFMG", // [数量]
		],

		AmountColumns: [
			"OUTBDMNG", // [所要数量]
			"OUTHIKIATESUYO", // [引当数量]
			"OUTENMNG", // [引落数量]
		],

		IdDateFieldsFilter: [
			"BDTER", // [所要日付]
		],

		TypeFields: {
			Number: "数値",
			Amount: "金額",
			Time: "時間",
			Date: "日付",
		},

		InsertOnlyEditableFields: {
			プラント: "OUTWERKS",
		},

		// Maps an OData field name to the English suffix used by Main.view.xml's
		// valueState<X> / valueStateText<X> bindings on the table rows.
		FieldStateKeys: {
			OUTZ_KIDAI_NO: "MachineNo", // [機台NO]
			OUTSORTL: "AssemblyMass", // [組立かたまり]
			OUTMATNR: "ItemCode", // [品目コード]
			OUTWERKS: "Plant", // [プラント]
			OUTKOUBAI_IRAI_TYPE: "PurchaseRequisitionType", // [購買依頼タイプ]
			OUTERFMG: "OUTERFMG", // [数量]
			Outerfme001: "OUTERFME", // [入力単位]
			OUTBDTER: "OUTBDTER", // [所要日付]
			OUTLGORT: "StorageLocation", // [保管場所]
			OUTZ_TASK_CODE: "OutboundTask", // [出庫タスク]
			OUTZ_SHUKKOSAKI: "Destination", // [出庫先]
			OUTZ_ZUBAN: "DrawingNo", // [図番]
			OUTZ_POSITION_NO: "Position", // [ポジション]
			OUTZ_PLNO: "PL", // [PL]
			OUTZ_OYA_HINBAN: "ParentPartNo", // [親品番]
			OUTZ_HOJO_HINBAN: "AuxiliaryPartNo", // [補助品番]
		},

		// 一括入力 (batch input) target fields.
		// `key`       : English field name -> screen model paths /select<key> and /Value<key>
		// `controlId` : ID of the input control inside the 一括入力 form
		// `output`    : property on the table row that receives the reflected value
		// `insertOnly`: true = reflect only to 追加 / 複写 rows ([組立かたまり])
		BatchInputFields: [
			// [組立かたまり]
			{ key: "AssemblyGroup", controlId: "BULKSORTL", output: "OUTSORTL", insertOnly: true },
			// [購買依頼タイプ]
			{ key: "PurchaseRequisitionType", controlId: "BULKKOUBAI_IRAI_TYPE", output: "OUTKOUBAI_IRAI_TYPE" },
			// [所要日付]
			{ key: "RequiredDate", controlId: "BULKBDTER", output: "OUTBDTER" },
			// [出庫タスク]
			{ key: "OutboundTask", controlId: "BULKZ_TASK_CODE", output: "OUTZ_TASK_CODE" },
			// [出庫先]
			{ key: "Destination", controlId: "BULKZ_SHUKKOSAKI", output: "OUTZ_SHUKKOSAKI" },
			// [保管場所]
			{ key: "StorageLocation", controlId: "BULKLGORT", output: "OUTLGORTvalue" },
			// [バックフラッシュ]
			{ key: "Backflush", controlId: "BULKRGEKZ", output: "OUTRGEKZ" },
		],

		// `key`: English field name, matches Main.view.xml's /select<key> and /Value<key> paths.
		// `controlId`: sap.ui.core.ID of the input control in Main.view.xml, used by
		// onChangeFieldForm() to detect which field changed.
		FieldsReflection: [
			{
				// [組立かたまり]
				key: "AssemblyGroup",
				controlId: "BULKSORTL",
				output: "OUTSORTL",
			},
			{
				// [購買依頼タイプ]
				key: "PurchaseRequisitionType",
				controlId: "BULKKOUBAI_IRAI_TYPE",
				output: "OUTKOUBAI_IRAI_TYPE",
			},
			{
				// [所要日付]
				key: "RequiredDate",
				controlId: "BULKBDTER",
				output: "OUTBDTER",
			},
			{
				// [出庫タスク]
				key: "OutboundTask",
				controlId: "BULKZ_TASK_CODE",
				output: "OUTZ_TASK_CODE",
			},
			{
				// [出庫先]
				key: "Destination",
				controlId: "BULKZ_SHUKKOSAKI",
				output: "OUTZ_SHUKKOSAKI",
			},
			{
				// [保管場所]
				key: "StorageLocation",
				controlId: "BULKLGORT",
				output: "OUTLGORTvalue",
			},
			{
				// [バックフラッシュ] (BF)
				key: "Backflush",
				controlId: "BULKRGEKZ",
				output: "OUTRGEKZ",
			},
		],

		// --- Row validation field lists (EXCEL取込 / 登録) ---

		// Max-length check
		LengthCheckFieldsImport: [
			{
				// [組立かたまり]
				field: "OUTSORTL",
				i18nKey: "headerAssemblyMass",
				maxLen: 10,
				state: "valueStateAssemblyMass",
				text: "valueStateTextAssemblyMass",
			},
			{
				// [出庫先]
				field: "OUTZ_SHUKKOSAKI",
				i18nKey: "headerDeliveryDestination",
				maxLen: 5,
				state: "valueStateDestination",
				text: "valueStateTextDestination",
			},
			{
				// [図番]
				field: "OUTZ_ZUBAN",
				i18nKey: "headerDrawingNumber",
				maxLen: 11,
				state: "valueStateDrawingNo",
				text: "valueStateTextDrawingNo",
			},
		],

		// Numeric range check
		NumberRangeCheckFields: [
			{
				// [数量]
				field: "OUTERFMG",
				i18nKey: "headerInputQuantity",
				maxVal: 9999999999,
				state: "valueStateOUTERFMG",
				text: "valueStateTextOUTERFMG",
			},
		],

		// Dropdown / search help value must exist in its list.
		// `listKey`     : name of the JSON model holding the valid values
		// `codeProp`    : property on that model holding the code
		// `skipOnImport`: true = excluded from the EXCEL取込 check ([プラント] is not editable on import)
		SelectCheckFields: [
			{
				// [プラント]
				field: "OUTWERKS",
				i18nKey: "headerPlant",
				listKey: "PlantModel",
				codeProp: "Code",
				state: "valueStatePlant",
				text: "valueStateTextPlant",
				skipOnImport: true,
			},
			{
				// [購買依頼タイプ]
				field: "OUTKOUBAI_IRAI_TYPEvalue",
				i18nKey: "headerPurchaseRequisitionType",
				listKey: "PurchaseReqTypeModel",
				codeProp: "Code",
				state: "valueStatePurchaseRequisitionType",
				text: "valueStateTextPurchaseRequisitionType",
			},
			{
				// [入力単位]
				field: "OUTERFME",
				i18nKey: "headerInputUnit",
				listKey: "UnitModel",
				codeProp: "Code",
				state: "valueStateOUTERFME",
				text: "valueStateTextOUTERFME",
			},
			{
				// [保管場所]
				field: "OUTLGORTvalue",
				i18nKey: "headerStorageLocation",
				listKey: "StorageLocationModel",
				codeProp: "Lgort",
				state: "valueStateStorageLocation",
				text: "valueStateTextStorageLocation",
			},
		],

		// Date format check
		TableDateFields: [
			{
				// [所要日付]
				value: "OUTBDTER",
				state: "valueStateOUTBDTER",
				text: "valueStateTextOUTBDTER",
			},
		],

		// Flag check
		FlagCheckFields: [
			// [バックフラッシュ]
			{ field: "OUTRGEKZ", i18nKey: "headerBackflush" },
		],

		// No.53 必須入力チェック — `required` は 画面項目定義書「入力可不可」が "◎" の［行区分］
		RequiredCellFields: {
			// [機台NO]
			OUTZ_KIDAI_NO: { state: "valueStateMachineNo", text: "valueStateTextMachineNo", required: ["A"] },
			// [組立かたまり]
			OUTSORTL: { state: "valueStateAssemblyMass", text: "valueStateTextAssemblyMass", required: ["N", "A"] },
			// [品目コード]
			OUTMATNR: { state: "valueStateItemCode", text: "valueStateTextItemCode", required: ["A"] },
			// [プラント]
			OUTWERKS: { state: "valueStatePlant", text: "valueStateTextPlant", required: ["A"] },
			// [購買依頼タイプ]
			OUTKOUBAI_IRAI_TYPE: {
				state: "valueStatePurchaseRequisitionType",
				text: "valueStateTextPurchaseRequisitionType",
				required: ["A"],
			},
			// [数量]
			OUTERFMG: { state: "valueStateOUTERFMG", text: "valueStateTextOUTERFMG", required: ["N", "A"] },
			// [入力単位]
			OUTERFME: { state: "valueStateOUTERFME", text: "valueStateTextOUTERFME", required: ["N", "A"] },
			// [所要日付]
			OUTBDTER: { state: "valueStateOUTBDTER", text: "valueStateTextOUTBDTER", required: ["N", "A"] },
			// [保管場所]
			OUTLGORT: { state: "valueStateStorageLocation", text: "valueStateTextStorageLocation", required: [] },
			// [出庫タスク]
			OUTZ_TASK_CODE: { state: "valueStateOutboundTask", text: "valueStateTextOutboundTask", required: ["N", "A"] },
			// [出庫先]
			OUTZ_SHUKKOSAKI: { state: "valueStateDestination", text: "valueStateTextDestination", required: ["N", "A"] },
			// [図番]
			OUTZ_ZUBAN: { state: "valueStateDrawingNo", text: "valueStateTextDrawingNo", required: ["N", "A"] },
			// [ポジション]
			OUTZ_POSITION_NO: { state: "valueStatePosition", text: "valueStateTextPosition", required: ["A"] },
			// [PL]
			OUTZ_PLNO: { state: "valueStatePL", text: "valueStateTextPL", required: ["A"] },
			// [親品番]
			OUTZ_OYA_HINBAN: { state: "valueStateParentPartNo", text: "valueStateTextParentPartNo", required: ["A"] },
			// [補助品番]
			OUTZ_HOJO_HINBAN: { state: "valueStateAuxiliaryPartNo", text: "valueStateTextAuxiliaryPartNo", required: ["A"] },
		},

		// 既存の OnChange 処理を持つ列
		CellChangeHandlers: {
			OUTZ_KIDAI_NO: "onFormatShowSuggestionOutboundTask", // [機台NO]
			OUTMATNR: "onProcurementTypeChange", // [品目コード]
			OUTWERKS: "onProcurementTypeChange", // [プラント]
			OUTZ_TASK_CODE: "onChangeOutboundTask", // [出庫タスク]
		},
	};
});
