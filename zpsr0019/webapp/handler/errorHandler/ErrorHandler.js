sap.ui.define(
	["sap/ui/base/Object", "sap/ui/core/MessageType", "./ODataError"],
	function (BaseObject, MessageType, ODataError) {
		"use strict";

		/**
		 * Constructor for a new ErrorHandler.
		 * @extends sap.ui.base.Object
		 * @constructor
		 * @public
		 */
		const ErrorHandler = BaseObject.extend("zpsr0019.errorhandler.ErrorHandler", {
			constructor: function () {
				BaseObject.apply(this, arguments);
			},
			metadata: {
				publicMethods: ["getMessagesResponse"],
			},
		});

		/**
		 * Get resource bundle object
		 */
		const oBundle = new sap.ui.model.resource.ResourceModel({
			bundleName: "zpsr0019.i18n.i18n",
		}).getResourceBundle();

		const ErrorType = {
			Exception: "Exception",
			OData: "OData",
			Other: "Other",
		};

		/**
		 * Analyze the error type based on the error object.
		 *
		 * @param {Error} oError
		 * @public
		 */
		const parseErrorType = function (oError) {
			let oJson;
			if (oError === undefined || oError === null) {
				throw new Error("Error object is null.");
			}

			if (oError instanceof Error) {
				return ErrorType.Exception;
			}

			// Any HTTP 500 is treated as an unexpected server error, regardless of response body shape
			if (Number(oError.statusCode) === 500) {
				return ErrorType.Other;
			}

			const sResponseText = oError.responseText;

			try {
				oJson = JSON.parse(sResponseText);
			} catch {
				oJson = null;
			}

			if (oJson === null) {
				// Cases where parsing as a JSON object fails
				return ErrorType.Other;
			} else if (oJson.error === undefined) {
				// JSON object but not in OData format
				return ErrorType.Other;
			} else {
				// JSON in OData format
				return ErrorType.OData;
			}
		};

		/**
		 * Get message on the OData service side
		 * @param {Error} oError
		 */
		ErrorHandler.getMessagesResponse = function (oError) {
			const aMessages = [];
			switch (parseErrorType(oError)) {
				case ErrorType.Exception:
					aMessages.push({
						type: MessageType.Error,
						title: oBundle.getText("ErrorTitle"),
						description: oError.message,
						subtitle: oError.message,
					});
					break;
				case ErrorType.OData:
					{
						const oODataError = new ODataError(oError);
						const error = oODataError.getErrorDetails() || oODataError.getErrorMessage();
						if (typeof error === "object") {
							error.forEach(function (oErr) {
								let sType = oErr?.severity?.charAt(0).toUpperCase() + oErr?.severity?.slice(1);
								if (sType === "Info") {
									sType = "Information";
								} else if (!sType) {
									sType = "Error";
								}
								aMessages.push({
									type: sType || MessageType.Error,
									title: oBundle.getText(`${sType}Title`),
									description: oErr.message,
									subtitle: oErr.message,
								});
							});
							break;
						}

						if (typeof error === "string") {
							aMessages.push({
								type: MessageType.Error,
								title: oBundle.getText("ErrorTitle"),
								description: error,
								subtitle: error,
							});
							break;
						}
					}
					break;
				case ErrorType.Other:
					aMessages.push({
						statusCode: "500",
						type: MessageType.Error,
						title: oBundle.getText("ErrorTitle"),
						description: "予期せぬエラーが発生しました。作業を中断し、管理者に連絡してください。",
						subtitle: "予期せぬエラーが発生しました。作業を中断し、管理者に連絡してください。",
					});
					break;
				default:
					break;
			}
			return aMessages;
		};
		return ErrorHandler;
	}
);
