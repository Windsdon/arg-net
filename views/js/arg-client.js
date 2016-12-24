(function () {
	var app = angular.module('argClient', []);

	const {ipcRenderer} = require('electron')

	app.factory('Settings', function ($q, $timeout, Client) {
		var data = ipcRenderer.sendSync('get-settings');
		data.client = Client.client;
		return data;
	});

	app.factory('Client', function ($timeout) {
		var r = {
			client: ipcRenderer.sendSync('get-client')
		};
		ipcRenderer.on('client-update', function (event, client) {
			console.log('Got client: ', client);
			$timeout(function () {
				r.client = client;
			});
		});

		return r;
	});
})();