'use strict';
const path = require('path');
const debug = require('debug')('client:workers');
const fs = require('fs');
const EventEmitter = require('events');
const clone = require('clone');
const CryptoJS = require('crypto-js');
const async = require('async');
const crypto = require('crypto');

const UP_TO_DATE = 'up-to-date';
const REQUIRES_UPDATE = 'requires-update';

class ProgressTracker {
	constructor(length) {
		this.length = length;
		this.count = 0;
		this.resolve = () => { };
	}

	check() {
		if (this.count === this.length) {
			this.resolve();
		}
	}

	solveOne() {
		this.count++;
		check();
	}

	solveAll() {
		this.count = this.length;
		check();
	}

	then(fn) {
		this.resolve = fn;
	}
}

module.exports = class Workers extends EventEmitter {
	/**
	 * Manages Workers and distributes tasks
	 * Workers should export a function which will be used
	 * as an async.queue worker
	 * 
	 * @param {string} server The server hostname
	 */
	constructor(server, request) {
		super();
		this.workers = {};
		this.server = server;
		this.request = request;
	}

	process(tasks) {
		for (var task of tasks) {
			debug('Processing task ' + task.id);
			let worker = this.getWorker(task.woker.id);
			if (worker) {
				worker.queue.push(task);
			}
		}
	}

	getWorker(id) {
		let worker = this.workers[id + '@' + this.server] || null;
		if (!worker) {
			debug('INVALID worker id: ' + id);
		}
		return worker;
	}

	load() {
		return new Promise((resolve, reject) => {
			this.reloadWorkers().then(resolve, reject);
		});
	}



	/**
	 * Get workers and return an array of ids
	 * 
	 * @returns {Array}
	 */
	getRemoteWorkers() {
		debug('GET workers');
		return new Promise((resolve, reject) => {
			this.request.get('/workers').then((data) => {
				debug(data);
				resolve(data.workers);
			}, reject);
		});
	}

	reloadWorkers() {
		debug('RELOAD workers');
		return new Promise((resolve, reject) => {
			this.getRemoteWorkers().then(workers => {
				async.queue((id, cb) => {
					this.checkWorker(id).then(o => {
						if (o.result == UP_TO_DATE) {
							this.loadWorker(id).then(() => {
								cb();
							}, cb);
						} else {
							this.downloadWorker(id, o.updateList).then(() => {
								this.loadWorker(id).then(() => {
									cb();
								}, cb);
							}, cb);
						}
					})
				}, 1).push(workers, (err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});

			}, reject);
		});
	}

	/**
	 * Loads a worker that has already been downloaded
	 * 
	 * @param {string} id The worker ID
	 * @returns {Promise}
	 */
	loadWorker(id, onlyHashes) {
		debug('LOAD worker ' + id)
		let workerPath = this.resolvePath(id);

		let worker = this.getWorker(id);

		if (!onlyHashes) {
			if (worker) {
				debug('\tWorker is loaded');
				let files = Object.keys(worker.files);
				debug('\tClearing cache');
				for (var file of files) {
					// these files are constructed as require.resolve(), so
					// we don't need to do that again
					debug('\t\tClear cache for ' + file);
					delete require.cache[require.resolve(file)];
				}
			} else {
				debug('\tWorker is not loaded');
			}
		}

		// clear the current manifest.json cache
		// this is actually not needed, because the manifest file should be in
		// the list of files for this worker
		let manifestPath;
		try {
			manifestPath = require.resolve(path.join(workerPath, 'manifest.json'));
		} catch (err) {
			debug('\tCannot locate manifest file');
			return new Promise((resolve, reject) => {
				reject(new Error('Cannot locate manifest file'));
			});
		}

		if (!onlyHashes) {
			debug('\tClear manifest cache: ' + manifestPath);
			delete require.cache[manifestPath];
		}

		// load the new manifest
		let manifest;
		try {
			manifest = require(manifestPath);
		} catch (err) {
			debug('\tCannot load manifest file');
			return new Promise((resolve, reject) => {
				reject(new Error('Cannot load manifest file'));
			});
		}

		// build the new worker object
		let w = {};
		w.files = {};
		w.manifest = clone(manifest);

		// compute the hash of each file so we can check for version mismatch later
		let files = manifest.client.files.concat(['manifest.json']);
		debug('\tCalculate hashes');
		for (var file of files) {
			let k = path.join(workerPath, file);
			try {
				let str = fs.readFileSync(k);
				let hash = crypto.createHash('sha256').update(str).digest('hex');
				w.files[file] = hash;
				debug('\t\tHash ' + file + ': ' + hash);
			} catch (err) {
				debug('\t\tError: ' + err.message);
			}
		}

		if (onlyHashes) {
			return new Promise((resolve, reject) => {
				resolve(w);
			});
		}

		this.workers[id + '@' + this.server] = w;
		var self = this;
		return new Promise((resolve, reject) => {
			function buildWorker(fn) {
				let concurrency = w.manifest.concurrency || 1;
				w.queue = async.queue(fn, concurrency);
				w.queue.drain = async.apply(self.queueFinished, w).bind(this);
				debug('\tBuilt worker with concurrency ' + concurrency);
				resolve(w);
			}

			// load the worker
			let worker = require(path.join(workerPath, 'worker.js'));
			if (typeof worker !== 'function') {
				// we should have a promise here
				debug('\tWorker returned Promise');
				worker.then(buildWorker, reject);
			} else {
				// we have the worker function
				buildWorker(worker);
			}
		});
	}

	downloadWorker(id, fl) {
		debug('DOWNLOAD worker ' + id);
		let workerPath = this.resolvePath(id);
		let removeFiles = fl || fs.readdirSync(workerPath);

		for (let file of removeFiles) {
			try {
				let p = path.join(workerPath, file);
				debug(`\tUNLINK ${p}`);
				//fs.unlinkSync();
			} catch (err) {
				debug('\t\tFailed: ' + err.messag);
			}
		}

		return new Promise((resolve, reject) => {
			let p = `/worker/${id}/files/`;
			this.request.get(`/worker/${id}`).then(w => {
				debug(`\tGET manifest`);
			}, err => {
				debug(`\tGET /worker/${id} rejected: ` + err.message);
				reject(err);
			});
		});
	}

	/**
	 * Called when a worker's queue is finished
	 * 
	 * @param {any} worker
	 */
	queueFinished(worker) {

	}

	/**
	 * Checks if a worker is up-to-date with the server
	 * 
	 * @param {string} id
	 * @returns {Promise}
	 */
	checkWorker(id) {
		debug('CHECK worker ' + id);
		return new Promise((resolve, reject) => {
			/**
			 * this should return:
			 * {
			 * 		manifest: ...,
			 * 		files: [
			 * 			{
			 * 				name: 'worker.js',
			 * 				hash: 'sha256 hash'
			 * 			},...
			 * 		]
			 * }
			 */
			var self = this;
			this.request.get('/worker/' + id).then(remoteWorker => {
				debug(`\tGET /worker/${id}: completed`);
				let worker = this.getWorker(id);
				function checkHashes(w) {
					debug('\tCheck hashes');
					let p = self.resolvePath(id);
					let toUpdate = [];
					for (let file of Object.keys(remoteWorker.files)) {
						if (!w.files[file] || w.files[file] != remoteWorker.files[file].hash) {
							debug('\t\tMISMATCH: ' + file);
							toUpdate.push(file);
						} else {
							debug('\t\tMATCH: ' + file);
						}
					}

					if (toUpdate.length > 0) {
						debug('\tRequires update for: ' + toUpdate.join(', '));
						resolve({
							result: REQUIRES_UPDATE,
							updateList: toUpdate
						});
					} else {
						debug('\tNo update required');
						resolve({
							result: UP_TO_DATE
						})
					}
				}

				if (!worker) {
					debug('\tWorker not loaded. Get hashes.');
					this.loadWorker(id, true).then(checkHashes, (err) => {
						// if it fails here, then we don't have anything
						resolve({
							result: REQUIRES_UPDATE
						});
					});
				} else {
					checkHashes(worker);
				}
			}, err => {
				debug(`\tGET /worker/${id} rejected: ` + err.message);
				reject(err);
			});
		});
	}

	resolvePath(id) {
		let p = path.join(process.cwd(), `workers/${id}@${this.server}`);
		try {
			fs.mkdirSync(p);
		} catch (err) {
		}
		return p;
	}
}