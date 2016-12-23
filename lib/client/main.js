'use static';

const Client = require('./Client.js');

let client = new Client();

client.run();

module.exports = client;