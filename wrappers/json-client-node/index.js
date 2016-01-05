var JsonClient = require('json-client');

if (!JsonClient.fetch)
	JsonClient.fetch = require('node-fetch');

module.exports = JsonClient;
