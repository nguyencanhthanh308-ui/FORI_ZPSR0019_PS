sap.ui.define([], function () {
	"use strict";

	/**
	 * debounce()
	 * Creates and returns a new debounced version of the given function.
	 * This function delays execution until after the specified wait (ms)
	 * has elapsed since the last time it was invoked.
	 * Useful for implementing behavior that should only occur
	 * once input has stopped arriving.
	 * If the immediate argument is set to true, the function will be triggered
	 * at the start of the wait interval instead of the end.
	 * This is helpful to prevent unintended double executions,
	 * such as when a "Submit" button is accidentally clicked twice.
	 * @param {Function} func Function to debounce
	 * @param {Number} wait Delay interval (milliseconds)
	 * @param {Boolean} immediate Immediate trigger flag
	 * @returns
	 */
	const debounce = function (func, wait, immediate) {
		let timeout;
		return function () {
			const context = this,
				args = arguments;
			clearTimeout(timeout);
			timeout = setTimeout(function () {
				timeout = null;
				if (!immediate) func.apply(context, args);
			}, wait);
			if (immediate && !timeout) func.apply(context, args);
		};
	};
	return debounce;
});
