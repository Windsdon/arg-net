'use strict';

process.env.DEBUG = 'client:*';

let client = require('./lib/client/main.js');

if (process.versions['electron']) {
	/**
	 * This is the GUI client.
	 */

	const electron = require('electron');
	const app = electron.app;
	const BrowserWindow = electron.BrowserWindow;

	const path = require('path');
	const url = require('url');

	let mainWindow;

	function createWindow() {
		let menu = new (electron.Menu)();

		menu.append(new (electron.MenuItem)({
			label: 'Application',
			submenu: [
				{
					role: 'quit'
				},
				{
					role: 'reload'
				}
			]
		}));

		mainWindow = new BrowserWindow({
			width: 900,
			height: 600,
			minWidth: 900,
			minHeight: 600,
			title: 'Arg Net',
			autoHideMenuBar: true
		});

		mainWindow.setMenu(menu);

		mainWindow.webContents.openDevTools();

		mainWindow.loadURL(url.format({
			pathname: path.join(__dirname, 'views/index.html'),
			protocol: 'file:',
			slashes: true
		}));

		mainWindow.on('closed', function () {
			mainWindow = null
		});
	}

	app.on('ready', createWindow);

	app.on('window-all-closed', function () {
		app.quit();
	});

	app.on('activate', function () {
		// ignore this for now
	});

	electron.ipcMain.on('get-client', (event, arg) => {
		event.returnValue = {
			id: client.id,
			uuid: client.uuid
		};
	});

	electron.ipcMain.on('get-settings', (event, arg) => {
		event.returnValue = client.getConfig();
	});
}