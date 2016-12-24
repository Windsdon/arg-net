'use strict';
const path = require('path');
const debug = require('debug')('client:tasks');
const fs = require('fs');
const EventEmitter = require('events');
const Serializable = require('./Serializable.js');

module.exports = class TaskManager extends EventEmitter {
	constructor() {
		super();
		this.running = {};
		Serializable(this);
	}
}