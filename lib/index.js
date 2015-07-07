'use strict';

var http = require('http');
var https = require('https');
var qs = require('qs');
var url = require('url');
var objectMerge = require('object-merge');

if (typeof Promise === 'undefined')
	var Promise = require('q').Promise;

module.exports = function (baseUrl, opts) {
	var client = new Client(baseUrl, opts);
	return client.request.bind(client);
};

var Client = function (baseUrl, opts) {
	this.baseUrl = baseUrl;

	this.options = objectMerge({
		headers: { Accept: 'application/json' }
	}, opts || {});
};

Client.prototype.request = function (method, path, params, options, body) {
	var query = params ? '?' + qs.stringify(params) : '';
	path = path + query;

	var resolved = url.resolve(this.baseUrl, path);
	resolved = url.parse(resolved);

	var headers = {};

	if (typeof body === 'object') {
		body = JSON.stringify(body);
		headers['Content-Type'] = 'application/json';
	}

	if (body)
		headers['Content-Length'] = Buffer.byteLength(body, 'utf8');

	options = objectMerge(this.options, options || {}, {
		method: method,
		path: resolved.path,
		hostname: resolved.hostname,
		port: resolved.port || (resolved.protocol == 'https:' ? 443 : 80),
		headers: headers
	});

	var newReq = this._request;
	var proto = resolved.protocol == 'https:' ? https : http;

	return new Promise(function (resolve, reject) {
		var request = proto.request(options);
		request.on('error', reject);

		if (body)
			request.end(body, 'utf8');
		else
			request.end();

		request.on('response', function (response) {
			var data = '';
			response.setEncoding('utf8');

			response.on('data', function (chunk) {
				data += chunk;
			});

			response.on('end', function () {
				var error;
				var code = response.statusCode;

				// do we need to catch 1xx codes?

				// 2xx - success
				if (code < 300) {
					if (!data || !data.length) {
						resolve(null);
						return;
					}

					try {
						data = JSON.parse(data);
					} catch (err) {
						error = new Error('invalid json');
						error.statusCode = code;
						error.data = data;
						reject(error);
						return;
					}

					resolve(data);
					return;
				}

				// 3xx - redirection
				// assumes that infinite loops won't happen
				if (code < 400) {
					switch (code) {
						case 304:
						case 305:
						case 306:
							error = new Error('HTTP ' + code + ': ' + http.STATUS_CODES[code]);
							error.code = error.statusCode = code;
							error.data = data;
							reject(error);
							return;

						case 307:
						case 308:
							// same request with new location
							newReq(method, response.headers.location, null, options, body)
							.then(resolve, reject);
							return;

						default:
							// get request for new location
							newReq('get', response.headers.location, null, options)
							.then(resolve, reject);
							return;
					}
				}

				// 4xx 5xx - failure
				error = new Error('HTTP ' + code + ': ' + http.STATUS_CODES[code]);
				error.code = error.statusCode = code;
				error.data = data;

				try {
					error.object = JSON.parse(data);
				} catch (err) {}

				reject(error);
			});
		});
	});
};
