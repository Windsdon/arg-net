(function () {
	var app = angular.module('argClient', []);

	const {ipcRenderer} = require('electron')

	app.factory('Settings', function ($q, $timeout) {
		var data = ipcRenderer.sendSync('get-settings');
		data.client = ipcRenderer.sendSync('get-client');
		return data;
	});
})();