sap.ui.define(["sap/ui/base/Object", "sap/ui/core/format/NumberFormat"], function (BaseObject) {
	"use strict";
	const Validator = BaseObject.extend("zpsr0113.libs.Validator", {
		constructor: function () {
			BaseObject.apply(this, arguments);
		},
		metadata: {
			publicMethods: [],
		},
	});

	Validator.isRequired = function (sInput) {
		return !Validator._noInput(sInput);
	};

	/**
	 * Check if input is null or undefine
	 * @param {String} sInput
	 * @returns If input is undefine or null ,true
	 */
	Validator._isNull = function (sInput) {
		return sInput === undefined || sInput === null;
	};

	/**
	 * Check if input is empty
	 * @param {String} sInput
	 * @returns If empty, true
	 */
	Validator._noInput = function (sInput) {
		// Check null or undefine
		if (Validator._isNull(sInput)) {
			return true;
		}
		// Check empty
		if (sInput === "") {
			return true;
		}
		// Check space
		if (/^\u0020+$/.test(sInput)) {
			return true;
		}
		return false;
	};

	Validator.isDateString = function (sTarget) {
		if (!sTarget) {
			return false;
		}

		if (!/^\d{4}(\/|-)\d{2}\1\d{2}$/.test(sTarget)) {
			return false;
		}

		const [year, month, day] = sTarget.split(/\/|-/).map((v) => parseInt(v, 10));
		const date = new Date(year, month - 1, day);

		return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
	};

	return Validator;
});
