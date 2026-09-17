sap.ui.define(["sap/ui/base/Object"], function (BaseObject) {
	"use strict";
	const Constant = BaseObject.extend("zpsr0010.utils.constant", {
		constructor: function () {
			BaseObject.apply(this, arguments);
		},
		metadata: {
			publicMethods: [],
		},
	});

	Constant.HiddenColumns = ["(編集不可フラグ)", "(入出庫予定)", "(明細番号)"];

	Constant.HiddenColumnsData = ["Outunchangeflg001", "Outrsnum001", "Outrspos001"];

	Constant.DisableColumns = [
		"No",
		"出庫指示状況",
		"機台NO",
		"要求NO",
		"組計状況", // No.1527
		"品目コード", // No.1527
		"プラント",
		"品目テキスト", // No.1527
		"所要数量", // No.1642
		"基本単位", // No.1642
		"引当数量", // No.2101
		"引落数量",
		"出庫完了フラグ",
		"ポジション",
		"PL",
		"親品番",
		"補助品番",
		"処理NO",
		"実出庫NO",
		"M",
		"入出庫予定番号", //No.1469
		"入出庫予定明細番号", //No.1469
		"BOM明細番号", //No.1469
		"保管場所(旧)", // No.1586
	];

	Constant.DisableColumnsData = [
		"index",
		"Outshukkojoukyou002",
		"Outkidaino001",
		"Outusr02002",
		"Outznw3status", // No.1527
		"Outmatnr002",
		"Outwerks002",
		"Outmaktx001",
		"Outbdmng002", // [所要数量] - No.1642
		"Outmeins001", // [基本単位]
		"Outhikiatesuryo001", // [引当数量] - No.2101
		"Outenmng001", // [引落数量]
		"Outkzear001",
		"Outpositionno001",
		"Outplno001",
		"Outoyahinban001",
		"Outhojohinban001",
		"Outshorino002",
		"Outjitsushukkono002",
		"Outkzmpf001",
		"Outrsnum001", //No.1469
		"Outrspos001", //No.1469
		"Outposnr001", //No.1469
		"Outlgortold001", // No.1586
	];

	Constant.DateColumns = ["Outbdter002"];

	Constant.NumberColumns = [
		"Outerfmg001", //数量 - No.1642
	];

	Constant.AmountColumns = [
		"Outbdmng002", // 所要数量 - No.1642
		"Outhikiatesuryo001", // 引当数量 - No.2101
		"Outenmng001", // 引落数量 - No.1642
	];

	Constant.UsageGuideTitle = "凡例";
	Constant.XLSXType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

	Constant.IdDateFieldsFilter = [
		"BDTER001", // [所要日付]
	];

	Constant.TableDateFields = [
		{
			// [所要日付]
			value: "Outbdter002",
			state: "valueStateOutbdter002",
			text: "valueStateTextOutbdter002",
		},
	];

	// no1641
	Constant.FieldsReflection = [
		{
			//組立かたまり
			key: "SORTL003",
			output: "Outsortl002",
		},
		{
			//購買依頼タイプ
			key: "BDMNG004",
			output: "Outbdmng001",
		},
		{
			//所要日付
			key: "BDTER003",
			output: "Outbdter002",
		},
		{
			//出庫タスク
			key: "Z_TASK_CODE003",
			output: "Outtaskcode002",
		},
		{
			//出庫先
			key: "Z_SHUKKOSAKI003",
			output: "Outshukkosaki002",
		},
		{
			//保管場所
			key: "LGORT003",
			output: "Outlgort002value",
		},
		{
			//バックフラッシュ (BF) - No.2047
			key: "RGEKZ002",
			output: "Outrgekz001",
		},
	];

	// No.2162
	Constant.TypeFields = {
		Number: "数値",
		Amount: "金額",
		Time: "時間",
		Date: "日付",
	};

	// No.2162
	Constant.InsertOnlyEditableFields = {
		プラント: "Outwerks002",
	};

	Constant.LengthCheckFieldsImport = [
		{
			field: "Outsortl002",
			i18nKey: "headerAssemblyMass",
			maxLen: 10,
			state: "valueStateOutsortl002",
			text: "valueStateTextOutsortl002",
		},
		{
			field: "Outshukkosaki002",
			i18nKey: "headerDeliveryDestination",
			maxLen: 5,
			state: "valueStateOutshukkosaki002",
			text: "valueStateTextOutshukkosaki002",
		},
		{
			field: "Outzuban002",
			i18nKey: "headerDrawingNumber",
			maxLen: 11,
			state: "valueStateOutzuban002",
			text: "valueStateTextOutzuban002",
		},
	];

	// No.2162
	Constant.NumberRangeCheckFields = [
		{
			field: "Outerfmg001",
			i18nKey: "headerInputQuantity",
			maxVal: 9999999999,
			state: "valueStateOuterfmg001",
			text: "valueStateTextOuterfmg001",
		},
	];

	// No.2162
	Constant.SelectCheckFields = [
		{
			field: "Outwerks002",
			i18nKey: "headerPlant",
			listKey: "SearchHelpPlantSet",
			codeProp: "Code",
			state: "valueStateOutwerks002",
			text: "valueStateTextOutwerks002",
		},
		{
			field: "Outbdmng001value",
			i18nKey: "headerPurchaseRequisitionType",
			listKey: "SearchHelpPurTypeSet",
			codeProp: "Code",
			state: "valueStateOutbdmng001",
			text: "valueStateTextOutbdmng001",
		},
		{
			field: "Outerfme001",
			i18nKey: "headerInputUnit",
			listKey: "SearchHelpUnitSet",
			codeProp: "Code",
			state: "valueStateOuterfme001",
			text: "valueStateTextOuterfme001",
		},
		{
			field: "Outlgort002value",
			i18nKey: "headerStorageLocation",
			listKey: "SearchHelpStgLocationSet",
			codeProp: "Lgort",
			state: "valueStateOutlgort002",
			text: "valueStateTextOutlgort002",
		},
	];

	// No.2162
	Constant.SelectCheckFieldsImport = Constant.SelectCheckFields.filter((item) => item.field !== "Outwerks002");

	// No.2162
	Constant.FlagCheckFields = [{ field: "Outrgekz001", i18nKey: "headerBackflush" }];

	return Constant;
});
