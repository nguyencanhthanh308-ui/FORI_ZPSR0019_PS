sap.ui.define(["sap/ui/base/Object"], function (BaseObject) {
	"use strict";
	const Message = BaseObject.extend("zsdr0026.libs.Message", {
		constructor: function () {
			BaseObject.apply(this, arguments);
		},
		metadata: {
			publicMethods: [],
		},
	});

	/**
	 * Get resource bundle object
	 */
	Message._oBundle = new sap.ui.model.resource.ResourceModel({
		bundleName: "zpsr0123.i18n.i18n",
	}).getResourceBundle();

	/**
	 * Define type of message
	 */
	Message.type = {
		Error: "Error",
		Success: "Success",
		Warning: "Warning",
		Information: "Information",
	};

	/**
	 * Create a error message
	 * @param {String} sErrorMessage
	 * @returns
	 */
	Message.createErrorMessage = function (sErrorMessage) {
		return {
			type: Message.type.Error,
			title: Message._oBundle.getText("ErrorTitle"),
			description: sErrorMessage,
			subtitle: sErrorMessage,
			counter: 1,
		};
	};

	/**
	 * Create a success message
	 * @param {String} sSuccessMessage
	 * @returns
	 */
	Message.createSuccessMessage = function (sSuccessMessage) {
		return {
			type: Message.type.Success,
			title: Message._oBundle.getText("SuccessTitle"),
			description: sSuccessMessage,
			subtitle: sSuccessMessage,
			counter: 1,
		};
	};

	/**
	 * Create a warining message
	 * @param {String} sMessage
	 * @returns
	 */
	Message.createWarningMessage = function (sMessage) {
		return {
			type: Message.type.Warning,
			title: Message._oBundle.getText("WarningTitle"),
			description: sMessage,
			subtitle: sMessage,
			counter: 1,
		};
	};

	/**
	 * Create a warining message
	 * @param {String} sMessage
	 * @returns
	 */
	Message.createInformationMessage = function (sMessage) {
		return {
			type: Message.type.Information,
			title: Message._oBundle.getText("InformationTitle"),
			description: sMessage,
			subtitle: sMessage,
			counter: 1,
		};
	};

	return Message;
});
