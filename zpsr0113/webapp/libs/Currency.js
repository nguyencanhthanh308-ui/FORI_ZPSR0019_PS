sap.ui.define(["sap/ui/base/Object", "sap/ui/core/format/NumberFormat"], function (BaseObject, NumberFormat) {
	"use strict";

	const Currency = BaseObject.extend("zpsr0113.libs.Currency", {
		constructor: function () {
			BaseObject.apply(this, arguments);
		},
		metadata: {
			publicMethods: [],
		},
	});

	/**
	 * Return true if has decimals by currency (JPY->false, USD->true)
	 */
	Currency.checkDecimalByCurrency = function (sCurrency) {
		const oCurrencyFormat = NumberFormat.getCurrencyInstance({
			showMeasure: false,
		});
		const sCheckString = oCurrencyFormat.format(1.1, sCurrency);
		return sCheckString.indexOf(".") !== -1;
	};

	return Currency;
});
