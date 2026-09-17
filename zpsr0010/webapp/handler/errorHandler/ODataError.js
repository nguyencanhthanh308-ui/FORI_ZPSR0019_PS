sap.ui.define(["sap/ui/base/Object"], function (BaseObject) {
	"use strict";

	/**
	 * Constructor for a new ODataError.
	 *
	 * @param {Error} oError
	 *
	 * @extends zpsr0123.errorhandler.error.BaseError
	 * @constructor
	 * @public
	 */
	const ODataError = BaseObject.extend("zpsr0010.errorhandler.error.ODataError", {
		constructor: function (oError) {
			BaseObject.apply(this, arguments);
			this._oJSONError = JSON.parse(oError.responseText);
		},
		metadata: {
			publicMethods: ["getErrorCode", "getErrorMessage", "getInnerError", "getErrorDetails"],
		},
	});

	/**
	 * Error Code
	 * @return {string} Error Code
	 * @public
	 */
	ODataError.prototype.getErrorCode = function () {
		return this._oJSONError.error.code;
	};

	/**
	 * Get Error Message
	 * @return {string} Error Message
	 * @public
	 */
	ODataError.prototype.getErrorMessage = function () {
		return this._oJSONError.error.message.value;
	};

	/**
	 * Get Inner Error
	 * @return {object}
	 * @public
	 */
	ODataError.prototype.getInnerError = function () {
		return this._oJSONError.error.innererror;
	};

	/**
	 * Get List Error
	 * @return {object[]}
	 * @public
	 */
	ODataError.prototype.getErrorDetails = function () {
		return this._oJSONError.error.innererror?.errordetails;
	};

	return ODataError;
});
