"use strict";

var http = require('http');
var https = require('https');
var qs = require('querystring');
var url = require('url');
var objectMerge = require('object-merge');
var Q = require('q');

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
		path: resolved.pathname,
		hostname: resolved.hostname,
		port: resolved.port || (resolved.protocol == 'https:' ? 443 : 80),
		headers: headers
	});

	var self = this;
	var deferred = Q.defer();
	var proto = resolved.protocol == 'https:' ? https : http;

	var request = proto.request(options, function (response) {
		var data = '';
		response.setEncoding('utf8');

		response.on('data', function (chunk) {
			data += chunk;
		});

		response.on('end', function () {
			try {
				var output = JSON.parse(data);
			} catch (ex) {
				deferred.reject(new Error('Invalid JSON'));
				return;
			}

			// assuming that infinite loops won't happen
			if (response.statusCode >= 300 && response.statusCode < 400) {
				self
					._request('get', response.headers.location)
					.then(deferred.resolve, deferred.reject);
				return;
			}

			if (response.statusCode === 404) {
				deferred.resolve(null);
				return;
			}

			if (response.statusCode == 422) {
				deferred.reject(output);
				return;
			}

			if (!(response.statusCode >= 200 && response.statusCode < 300)) {
				var error = new Error('HttpError');
				error.relatedObject = output;
				error.code = error.statusCode = response.statusCode;
				deferred.reject(error);
				return;
			}

			deferred.resolve(output);
		});
	});

	if (body)
		request.write(body, 'utf8');

	request.end();

	request.on('error', function (error) {
		deferred.reject(error);
	});

	return deferred.promise;
};
