sap.ui.define(["sap/ui/base/Object", "sap/ui/core/format/NumberFormat"], function (BaseObject) {
	"use strict";
	const Validator = BaseObject.extend("zpsr0122.libs.Validator", {
		constructor: function () {
			BaseObject.apply(this, arguments);
		},
		metadata: {
			publicMethods: [],
		},
	});

	/**
	 *	Validate valid controls value
	 * @param {sap.ui.core.Control || Object} oTarget
	 * @param {string} sKey
	 * @param {Array} aCriteriaChecks
	 * @returns
	 */
	Validator._controlValidations = function (oTarget, sKey, aCriteriaChecks) {
		const aMessages = [];
		let bExistFails = false;

		aCriteriaChecks.forEach((oCritera) => {
			const bResultCheck = oCritera.fnCheck();
			if (bExistFails) {
				return;
			}

			if (oTarget instanceof sap.ui.core.Control) {
				oTarget.setValueState(bResultCheck ? "None" : "Error");
				oTarget.setValueStateText(bResultCheck ? "" : oCritera.sStateMessage || oCritera.sMessage);
			} else {
				if (bResultCheck) {
					delete oTarget[`${sKey}State`];
					delete oTarget[`${sKey}Text`];
				} else {
					oTarget[`${sKey}State`] = "Error";
					oTarget[`${sKey}Text`] = oCritera.sStateMessage || oCritera.sMessage;
				}
			}

			if (!bResultCheck) {
				aMessages.push(oCritera.sMessage);
				bExistFails = true;
			}
		});

		return aMessages;
	};

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

	/**
	 * 日付文字列の有効性チェック
	 * @param {string} sTarget
	 * @return {boolean} true=有効値
	 */
	Validator.isDateString = function (sTarget) {
		const retValue = true;

		if (sTarget === void 0) {
			// 無い場合は無視
			return retValue;
		}

		// Check date range
		if (sTarget.includes(" - ")) {
			const datesSplit = sTarget.split(" - ");
			return datesSplit.every((date) => Validator.isDateString(date));
		}

		let year, month, day;

		// yyyyMMdd
		if (/^\d{8}$/.test(sTarget)) {
			year = parseInt(sTarget.substring(0, 4), 10);
			month = parseInt(sTarget.substring(4, 6), 10);
			day = parseInt(sTarget.substring(6, 8), 10);
		}
		// yyyy/mm/dd または yyyy-mm-dd
		else if (/^\d{1,4}(\/|-)\d{1,2}\1\d{1,2}$/.test(sTarget)) {
			const aDate = sTarget.split(/\/|-/).map((v) => parseInt(v, 10));
			year = aDate[0];
			month = aDate[1];
			day = aDate[2];
		} else {
			return false;
		}

		const date = new Date(year, month - 1, day);

		return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
	};

	return Validator;
});
