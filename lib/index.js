const fetch = require('fetch-everywhere');
const objectAssign = require('es6-object-assign').assign;
const qs = require('qs');
const url = require('url');

const defaultOptions = {
	headers: {
		'accept': 'application/json',
		'user-agent': 'json-client/0.8.5 (+https://github.com/billinghamj/json-client)',
	},
};

module.exports = JsonClient;

function JsonClient(baseUrl, options) {
	const resolvedBaseUrl = baseUrl.replace(/\/*$/, '/');
	const baseOptions = mergeOptions(defaultOptions, options);

	return function JsonClientRequest(method, path, params, body, options) {
		const query = params ? '?' + qs.stringify(params) : '';
		const resolved = url.resolve(resolvedBaseUrl, path + query);
		const reqOptions = mergeOptions(baseOptions, options);

		return makeRequest(method, resolved, body, reqOptions);
	};
}

function makeRequest(method, fullUrl, body, options) {
	const overrideOptions = {
		method: method,
	};

	if (body !== null) {
		overrideOptions.body = JSON.stringify(body);
		overrideOptions.headers = { 'content-type': 'application/json' };
	}

	const fetchOptions = mergeOptions(options, overrideOptions);

	return fetch(fullUrl, fetchOptions)
		.then(function (response) {
			return response.text()
				.then(function (body) {
					return objectAssign({}, response, {
						body: body,
					});
				});
		})
		.then(function (response) {
			const body = response.body;
			const code = response.status;

			const codeFriendly = response.statusText || 'Unknown';
			const codeStr = codeFriendly.toLowerCase().replace(/\s+/g, '_');

			// 2xx - success
			if (response.ok) {
				if (!body || !body.length)
					return null;

				try {
					return JSON.parse(body);
				} catch (e) {
					const error = new Error('invalid json');

					error.code = 'invalid_json';
					error.statusCode = code;
					error.meta = { httpStatus: code, method: method, url: fullUrl, data: body };

					throw error;
				}
			}

			// any non-success codes
			// includes 4xx, 5xx and some 3xx codes
			const error = new Error('HTTP ' + code + ': ' + codeFriendly);

			error.code = codeStr;
			error.statusCode = code;
			error.meta = { httpStatus: code, method: method, url: fullUrl, data: body };

			try {
				const json = JSON.parse(body);

				if (typeof json !== 'object' || Array.isArray(json))
					throw new Error();

				if (typeof json.code === 'string') {
					Object.keys(json).forEach(function (key) {
						error[key] = json[key];
					});
				} else {
					error.meta = json;
				}
			} catch (e) { /**/ }

			throw error;
		});
}

function mergeOptions(baseOptions, newOptions) {
	const resolvedNewOptions = newOptions || {};
	const headers = objectAssign({}, baseOptions.headers, resolvedNewOptions.headers);

	return objectAssign({}, baseOptions, newOptions, {
		headers: headers,
	});
}
