'use static';

const Client = require('./Client.js');

let client = new Client();

setTimeout(client.run.bind(client), 10000);

module.exports = client;