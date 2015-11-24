const http = require('http');
const https = require('https');
const qs = require('qs');
const url = require('url');
const path = require('path');
const objectMerge = require('object-merge');

module.exports = function (baseUrl, opts) {
	const client = new Client(baseUrl, opts);
	return client.request.bind(client);
};

const Client = function (baseUrl, opts) {
	this.baseUrl = baseUrl;

	this.options = objectMerge({
		headers: { Accept: 'application/json' }
	}, opts || {});
};

Client.prototype.request = function (method, path, params, body, options) {
	const query = params ? '?' + qs.stringify(params) : '';

	const resolved = url.resolve(this.baseUrl, path + query);
	const urlObj = url.parse(resolved);

	const headers = {};

	if (typeof body === 'object') {
		body = JSON.stringify(body);
		headers['Content-Type'] = 'application/json';
	}

	if (body)
		headers['Content-Length'] = Buffer.byteLength(body, 'utf8');

	options = objectMerge(this.options, options || {}, {
		method: method,
		path: urlObj.path,
		hostname: urlObj.hostname,
		port: urlObj.port || (urlObj.protocol.startsWith('https') ? 443 : 80),
		headers: headers
	});

	const newReq = this.request.bind(this);
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
					const nLoc = resolveRedirect(urlObj, response.headers.location);

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
							newReq(method, nLoc, null, body, options)
							.then(resolve, reject);
							return;

						default: // redirect - change method to GET
							newReq('get', nLoc, null, null, options)
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
};

function resolveRedirect(previous, redirectTo) {
	function startsWithProtocol(u) {
		return !!url.parse(redirectTo).protocol;
	}

	function fromRoot(p) {
		return p.startsWith('/');
	}

	if (startsWithProtocol(redirectTo)) {
		return redirectTo;
	}

	const p = typeof previous === 'string' ?
		url.parse(previous) :
		previous;

	if (fromRoot(redirectTo)) {
		p.pathname = redirectTo;
	} else {
		p.pathname = path.join(p.pathname, '..', redirectTo);
	}

	p.search = null;
	p.query = null;

	return p;
}
