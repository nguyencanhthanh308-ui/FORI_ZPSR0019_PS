/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zpsr0010/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
