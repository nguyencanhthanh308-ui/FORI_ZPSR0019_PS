sap.ui.define([], function () {
	"use strict";

	/**
	 *
	 * @param {object} oView
	 * @param {object} oFilterModel
	 * @returns
	 */
	const getCustomURL = function (oView, oFilterModel, aFilterID) {
		const aParams = [];
		const oController = oView.getController();
		const sAllHash = sap.ushell.Container.getService("URLParsing").getHash(window.location.href);
		const sHash = sAllHash.split("?")[0];
		const aFilterBars = oController._getFilterBars();
		const aFilterItems = aFilterBars.reduce((aAccumulator, oFilterBar) => {
			const aItems = oFilterBar.getAllFilterItems();
			return [...aAccumulator, ...aItems];
		}, []);
		const oFilter = oFilterModel.getData();
		aParams.push(`EXEC_MODE=${oController.sExec_mode}`);
		aFilterItems.forEach((oItem) => {
			const sName = oItem.getProperty("name");
			const oFilterData = oFilter[sName];

			if (Array.isArray(oFilterData) && oFilterData.length === 0) {
				return;
			}

			if (typeof oFilterData === "object") {
				const sDecode = encodeURIComponent(JSON.stringify(oFilterData));
				if (sDecode) {
					aParams.push(`${sName}=${sDecode}`);
				}
			}

			if (typeof oFilterData === "string") {
				if (oFilterData) {
					aParams.push(`${sName}=${oFilterData}`);
				}
			}

			if (typeof oFilterData === "number") {
				aParams.push(`${sName}=${oFilterData}`);
			}

			if (typeof oFilterData === "boolean" && oFilterData) {
				aParams.push(`${sName}=X`);
			}
		});
		return `#${sHash}?${aParams.join("&")}`;
	};

	/**
	 * Stringify sap.ui.model.Filter into string suitable odata query
	 * @returns
	 */
	const _getODataQueryStringFromFilter = async function (oController) {
		const _converFilterToString = function (oSingleFilter) {
			const sPath = oSingleFilter.getPath();
			const sOperator = oSingleFilter.getOperator()?.toLowerCase();
			const sValue1 = oSingleFilter.getValue1();
			const sValue2 = oSingleFilter.getValue2();
			switch (sOperator) {
				case "eq":
				case "ne":
				case "lt":
				case "le":
				case "gt":
				case "ge":
					return `${sPath} ${sOperator} '${sValue1}'`;
				case "bt":
					return `${sPath} ge '${sValue1}' and ${sPath} le '${sValue2}'`;
				case "contains":
					return `substringof('${sValue1}', ${sPath})`;
				default:
					return `${sPath} ${sOperator} '${sValue1}'`;
			}
		};

		let sResults = "";
		try {
			const aFilters = await oController._getFilters();
			sResults = aFilters
				.map((oFilter) => {
					const aMultiFilters = oFilter.getFilters();
					if (aMultiFilters) {
						const sConvertFilter = aMultiFilters.map((oSingleFilter) => {
							return `${_converFilterToString(oSingleFilter)}`;
						});
						return `(${sConvertFilter.join(" or ")})`;
					} else {
						return `(${_converFilterToString(oFilter)})`;
					}
				})
				.join(" and ");
		} catch {
			return "";
		}
		return sResults ? `?$filter=${sResults}` : "";
	};

	return {
		initialBookmark: function (sServicePath, aFilterID) {
			const oView = this.getView();
			const oModel = this.getOwnerComponent().getModel();
			const oScreenModel = this._getScreenModel();
			const oAddToHome = oView.byId("addToHome");
			let sFilter = "";
			oAddToHome.attachBrowserEvent(
				"click",
				async function () {
					sFilter = await _getODataQueryStringFromFilter(this);
				}.bind(this)
			);
			oAddToHome.setBeforePressHandler(() => {
				const sServiceURL = oModel.sServiceUrl + sServicePath;
				const sMode = oView.getController().sExec_mode;
				const sTitle = sMode === "A" ? this.oBundle.getText("TitleModeA") : this.oBundle.getText("TitleModeE");
				const oData = {
					title: sTitle,
					icon: "sap-icon://home",
					serviceUrl: sFilter ? `${sServiceURL}${sFilter}` : "",
					serviceRefreshInterval: "3000",
					customUrl: getCustomURL(oView, oScreenModel, aFilterID),
				};
				oAddToHome.setAppData(oData);
			});
		},
	};
});
