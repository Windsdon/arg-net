'use strict';

module.exports = function (self) {
	self._serializable = function () {
		let c = {};
		for (let k of Object.keys(this)) {
			if (this[k] && typeof (this[k]._serialize) == 'function') {
				c[k] = this[k]._serializable();
			} else {
				try {
					c[k] = JSON.parse(JSON.stringify(this[k]));
				} catch (err) {

				}
			}
		}

		return c;
	}
}