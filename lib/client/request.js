'use strict';

/**
 * A wrapper for the request API
 */

const request = require('request');
const debug = require('debug')('client:request');

/**
 * @param {string} hostname The hostname
 */
module.exports = function (hostname, client) {
	let _request = request.defaults({
		headers: {
			'X-Client-UUID': client.uuid
		}
	});

	let r = {};
	r.request = request;

	function mp(endpoint) {
		return 'http://' + hostname + endpoint
	}

	r.get = function (endpoint, opt) {
		opt = opt || {};
		opt.url = mp(endpoint);
		if (opt.getRequest) {
			return _request.get(opt);
		}
		return new Promise((resolve, reject) => {
			_request.get(opt, function (err, res, body) {
				if (err || res.statusCode >= 400) {
					return reject(err || JSON.parse(body));
				}
				if (opt.raw || res.headers['X-Do-Not-Parse']) {
					debug('X-Do-Not-Parse is set');
					resolve(res, body);
				} else {
					debug('Parsing contents');
					try {
						resolve(JSON.parse(body));
					} catch (err) {
						reject(err);
					}
				}
			});
		});
	}

	/**
	 * Calculates the signature for the payload and sends
	 */
	r.post = function (endpoint, opt) {
		opt = opt || {};
		opt.headers = opt.headers || {};
		opt.headers['X-Signature'] = client.key.sign(JSON.stringify(opt.data), 'hex');
		opt.headers['X-Client-ID'] = client.id;
		opt.url = mp(endpoint);
		console.log(opt);
		return new Promise((resolve, reject) => {
			_request.post(opt, function (err, res, body) {
				if (err || res.statusCode >= 400) {
					return reject(err || JSON.parse(body));
				}
				if (opt.raw || res.headers['X-Do-Not-Parse']) {
					resolve(res, body);
				} else {
					try {
						resolve(res, JSON.parse(body));
					} catch (err) {
						reject(err);
					}
				}
			});
		});
	}

	return r;
}