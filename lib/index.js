const qs = require('qs');
const url = require('url');
const objectMerge = require('object-merge');
const fetch = require('fetch-everywhere');

module.exports = JsonClient;

function JsonClient(baseUrl, mainOptions) {
	mainOptions = objectMerge({
		headers: { Accept: 'application/json' },
	}, mainOptions || {});

	return function JsonClientRequest(method, path, params, body, options) {
		const query = params ? '?' + qs.stringify(params) : '';
		const resolved = url.resolve(baseUrl, path + query);

		options = objectMerge(mainOptions, options || {});

		return makeRequest(method, resolved, body, options);
	};
}

function makeRequest(method, fullUrl, body, options) {
	const headers = {};

	if (typeof body === 'object') {
		body = JSON.stringify(body);
		headers['Content-Type'] = 'application/json';
	}

	options = objectMerge(options, {
		method: method,
		headers: headers,
		body: body,
	});

	return fetch(fullUrl, options)
	.then(function (response) {
		return response.text()
		.then(function (data) {
			response.body = data;
			return response;
		});
	})
	.then(function (response) {
		var error;

		const data = response.body;
		const code = response.status;

		const codeFriendly = response.statusText || 'Unknown';
		const codeStr = codeFriendly.toLowerCase().replace(/\s+/g, '_');

		// 2xx - success
		if (response.ok) {
			if (!data || !data.length)
				return null;

			try {
				return JSON.parse(data);
			} catch (e) {
				error = new Error('invalid json');
				error.code = 'invalid_json';
				error.statusCode = code;
				error.meta = { httpStatus: code, method: method, url: fullUrl, data: data };
				throw error;
			}
		}

		// any non-success codes
		// includes 4xx, 5xx and some 3xx codes
		error = new Error('HTTP ' + code + ': ' + codeFriendly);
		error.code = codeStr;
		error.statusCode = code;
		error.meta = { httpStatus: code, method: method, url: fullUrl, data: data };

		try {
			const json = JSON.parse(data);

			if (typeof json !== 'object' || Array.isArray(json))
				throw new Error();

			if (typeof json.code === 'string') {
				Object.keys(json).forEach(function (key) {
					error[key] = json[key];
				});
			} else {
				error.meta = json;
			}
		} catch (e) {/**/}

		throw error;
	});
}
