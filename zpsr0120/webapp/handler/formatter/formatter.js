sap.ui.define(["../helper/Validator", "sap/ui/core/format/NumberFormat"], function (Validator, NumberFormat) {
	"use strict";

	return {
		/**
		 * Handle format yyyyMMdd to yyyy/MM/dd
		 * @param {*} sInputDate
		 */
		onFormatDisplayDate: function (sInputDate) {
			if (!Validator.isRequired(sInputDate)) {
				return "";
			}

			if (sInputDate.replaceAll("0", "") === "") {
				return "";
			}

			if (sInputDate.length === 8) {
				return `${sInputDate.slice(0, 4)}/${sInputDate.slice(4, 6)}/${sInputDate.slice(6, 8)}`;
			}

			return sInputDate;
		},

		/**
		 * Check if input value has decimal character
		 * @param {String} sCurrency
		 * @returns
		 */
		_checkDecimalByCurrency: function (sCurrency) {
			const oCurrencyFormat = NumberFormat.getCurrencyInstance({
				showMeasure: false,
			});
			const sCheckString = oCurrencyFormat.format(1.1, sCurrency);
			return sCheckString.indexOf(".") !== -1;
		},

		/**
		 * Format money by currency
		 * Input formatted : 123,456,789.00 if bSeparate = true : 123456789.00 if false
		 * @param {String} sMoney
		 * @param {String} sCurrency
		 * @param {Boolean} bSeparate   is has Separate
		 * @param {Boolean} [bNegativeValue] is Negative value
		 * @returns {String}
		 */
		displayMoneyFormatter: function (sMoney, sCurrency, bSeparate, bNegativeValue = false) {
			if (!Validator.isRequired(sMoney)) {
				return "";
			}
			let formattedValue = sMoney;
			if (formattedValue.includes(",")) {
				formattedValue = formattedValue.replaceAll(",", "");
			}
			const bIsHasDecimal = this._checkDecimalByCurrency(sCurrency);

			const sRegex = bIsHasDecimal ? /[^0-9.-]/g : /[^0-9.-]/g;
			if (formattedValue.match(sRegex)) {
				formattedValue = formattedValue.replaceAll(sRegex, "");
			}
			const bNegativeData = formattedValue.indexOf("-") !== -1;
			formattedValue = bNegativeData ? formattedValue.replaceAll("-", "") : formattedValue;

			// Formatting value 123456789.00 if has decimal, 123456789 if not
			if (formattedValue) {
				if (bIsHasDecimal) {
					const oFormatter = new Intl.NumberFormat("en-US", {
						currency: "USD",
						minimumFractionDigits: 2,
					});
					formattedValue = oFormatter.format(formattedValue);
				} else {
					const oFormatter = new Intl.NumberFormat("en-US", {
						currency: "JPY",
						minimumFractionDigits: 0,
					});
					formattedValue = oFormatter.format(formattedValue);
				}
			}
			const sResult = bNegativeData ? `-${formattedValue}` : formattedValue;
			if (bSeparate) {
				return sResult;
			} else {
				return sResult.replaceAll(",", "");
			}
		},

		/**
		 * Return date Object date from yyyy/MM/dd
		 * @param {String} sDateInput
		 */
		dateFormatter: function (sDateInput) {
			if (!Validator.isRequired(sDateInput)) {
				return "";
			}

			const oDatePicker = new sap.m.DatePicker();
			oDatePicker.setDisplayFormat("yyyy/MM/dd");
			oDatePicker.setValue(sDateInput);
			const oDateObject = oDatePicker.getDateValue() || undefined;

			if (!oDateObject) {
				return sDateInput;
			}
			const sYear = oDateObject.getFullYear();
			let sMonth = oDateObject.getMonth() + 1;
			let sDay = oDateObject.getDate();
			sMonth = sMonth < 10 ? (sMonth = `0${sMonth}`) : sMonth;
			sDay = sDay < 10 ? (sDay = `0${sDay}`) : sDay;
			const oDate = new Date(`${sYear}-${sMonth}-${sDay}T00:00:00`);
			const oTimeStamp = new Date(oDate.setDate(oDate.getDate() + 1));
			oTimeStamp.setUTCHours(0);
			oTimeStamp.setUTCMinutes(0);
			oTimeStamp.setMilliseconds(0);
			return oTimeStamp;
		},

		/**
		 * Return date format Date Object to yyyy/MM/dd
		 * @param {String} oDateInput
		 */
		dateObjectFormatter: function (oDateInput) {
			if (!Validator.isRequired(oDateInput)) {
				return "";
			}
			const sYear = oDateInput.getFullYear();
			let sMonth = oDateInput.getMonth() + 1;
			let sDay = oDateInput.getDate();
			sMonth = sMonth < 10 ? (sMonth = `0${sMonth}`) : sMonth;
			sDay = sDay < 10 ? (sDay = `0${sDay}`) : sDay;
			return `${sYear}${sMonth}${sDay}`;
		},
	};
});
