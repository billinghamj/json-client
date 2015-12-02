const http = require('http');
const https = require('https');
const qs = require('qs');
const url = require('url');
const objectMerge = require('object-merge');

module.exports = function (baseUrl, mainOptions) {
	mainOptions = objectMerge({
		headers: { Accept: 'application/json' },
	}, mainOptions || {});

	return function (method, path, params, body, options) {
		const query = params ? '?' + qs.stringify(params) : '';
		const resolved = url.resolve(baseUrl, path + query);

		options = objectMerge(mainOptions, options || {});

		return makeRequest(method, resolved, body, options);
	};
};

function makeRequest(method, fullUrl, body, options) {
	const urlObj = url.parse(fullUrl);
	const headers = {};

	if (typeof body === 'object') {
		body = JSON.stringify(body);
		headers['Content-Type'] = 'application/json';
	}

	if (body)
		headers['Content-Length'] = Buffer.byteLength(body, 'utf8');

	options = objectMerge(options, {
		method: method,
		path: urlObj.path,
		hostname: urlObj.hostname,
		port: urlObj.port || (urlObj.protocol.startsWith('https') ? 443 : 80),
		headers: headers,
	});

	const proto = urlObj.protocol.startsWith('https') ? https : http;

	return new Promise(function (resolve, reject) {
		const request = proto.request(options);
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
				const code = response.statusCode;
				const codeFriendly = http.STATUS_CODES[code] || 'Unknown';
				const codeStr = codeFriendly.toLowerCase().replace(/\s+/g, '_');

				// do we need to catch 1xx codes?

				// 2xx - success
				if (code < 300) {
					if (!data || !data.length) {
						resolve(null);
						return;
					}

					try {
						data = JSON.parse(data);
					} catch (e) {
						error = new Error('invalid json');
						error.code = 'invalid_json';
						error.statusCode = code;
						error.meta = { httpStatus: code, data: data };
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
						case 304: // not modified
						case 305: // use proxy (not supported)
						case 306: // switch proxy (not supported)
							error = new Error('HTTP ' + code + ': ' + codeFriendly);
							error.code = codeStr;
							error.statusCode = code;
							error.meta = { httpStatus: code, data: data };
							reject(error);
							return;

						case 307: // temporary redirect - maintain method
						case 308: // permanent redirect - maintain method
							const newUrl = url.resolve(fullUrl, response.headers.location);
							makeRequest(method, newUrl, null, body, options)
							.then(resolve, reject);
							return;

						default: // redirect - change method to GET
							const newUrl = url.resolve(fullUrl, response.headers.location);
							makeRequest('get', newUrl, null, null, options)
							.then(resolve, reject);
							return;
					}
				}

				// 4xx 5xx - failure
				error = new Error('HTTP ' + code + ': ' + codeFriendly);
				error.code = codeStr;
				error.statusCode = code;
				error.meta = { httpStatus: code, data: data };

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
				} catch (e) {}

				reject(error);
			});
		});
	});
}
