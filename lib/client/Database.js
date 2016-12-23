'use strict';

const Datastore = require('nedb');
const fs = require('fs');
const path = require('path');

class DatabaseInterface {
	constructor(store) {
		this.db = store;
	}

	find(q) {
		return new Promise((resolve, reject) => {
			this.db.find(q, (err, data) => {
				if (err) {
					return reject(err);
				}

				resolve(data);
			})
		});
	}

	insert(o) {
		return new Promise((resolve, reject) => {
			this.db.insert(o, (err, doc) => {
				if (err) {
					return reject(err);
				}
				resolve(doc);
			});
		});
	}
}

function createDB(name) {
	return new DatabaseInterface(new Datastore({
		filename: path.join(process.cwd(), './db/' + name + '.nedb'),
		autoload: true
	}));
}

module.exports = {
	tasks: createDB('tasks')
}