'use strict';
const debug = require('debug')('client:client');
const fs = require('fs');
const NodeRSA = require('node-rsa');
const EventEmitter = require('events');
const path = require('path');
const {ClientUUID} = require('../utils.js');
const config = require('config');
const Workers = require('./Workers.js');

module.exports = class Client extends EventEmitter {
	constructor() {
		super();
		this.key = new NodeRSA();

		this.loadKey();
		this.request = require('./request.js')(config.get('server'), this);
		this.workers = new Workers(config.get('server'), this.request);
	}

	/**
	 * Loads or generates the key pair and populates id and uuid
	 */
	loadKey() {
		let key;
		let privatePath = path.join(process.cwd(), 'config/id_rsa.pem');
		let publicPath = path.join(process.cwd(), 'config/id_rsa.pub');
		try {
			key = fs.readFileSync(privatePath).toString();
		} catch (err) {
			debug('Failed to load private key from ' + privatePath, err.message);
		}

		if (key) {
			this.key.importKey(key, 'pkcs8-private-pem');
			let publicKey = this.key.exportKey('pkcs8-public-der').toString('base64');
			this.id = publicKey;
			this.uuid = ClientUUID(publicKey);
			debug('Client UUID: ' + this.uuid);
		} else {
			debug('Generating private key');
			this.key.generateKeyPair();
			fs.writeFileSync(privatePath, this.key.exportKey('pkcs8-private-pem'));
			fs.writeFileSync(publicPath, this.key.exportKey('pkcs8-public-pem'));
			this.loadKey();
		}
	}

	setConfig(config, value) {

	}

	getConfig() {
		return {};
	}

	load() {
		return new Promise((resolve, reject) => {
			this.workers.load().then(resolve, reject);
		});
	}

	run() {
		this.load().then(() => {
			debug('Workers loaded');
			debug('Finished loading');
		}, err => {
			debug('Loading Failed:');
			debug(err);
		})
	}
}