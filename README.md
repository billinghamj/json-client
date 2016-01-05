# json client

Simple library for requesting data from JSON APIs.

Returns promises only. Standard callbacks are not supported.

```js
var JsonClient = require('json-client');
var client = JsonClient('https://api.example.com/v1/');

client('get', 'users/123').then(function (user) {
	console.log(user);
});
```

## Installation

```bash
$ npm install json-client
```

### Notes

json client uses [`fetch`](https://fetch.spec.whatwg.org) to make requests
internally. If a global called `fetch` is not defined, you can explicitly
provide an implementation:

```js
var JsonClient = require('json-client');

if (!JsonClient.fetch)
	JsonClient.fetch = require('node-fetch');

var client = JsonClient('https://api.example.com/v1/');
```

Note - you must provide the implementation *before* creating a client. If an
implementation is not available, JsonClient will throw an error:
"JsonClient.fetch implementation missing - see readme".

With regards to specific environments, compatibility-wise:

<table>
	<thead>
		<tr>
			<th>Environment</th>
			<th>Native Fetch</th>
			<th>How to use</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>Node JS</td>
			<td>No</td>
			<td>use <a href="https://npmjs.com/package/json-client-node"><code>json-client-node</code></a></td>
		</tr>
		<tr>
			<td>React Native</td>
			<td>Yes</td>
			<td>use <code>json-client</code> as-is</td>
		</tr>
		<tr>
			<td>Browsers</td>
			<td>Sometimes</td>
			<td>polyfill with <a href="https://github.com/github/fetch">GitHub's fetch</a></td>
		</tr>
	</tbody>
</table>

Other environments are not currently supported, but I'm keen to include others.
If you'd like to use json client with another environment, or it isn't working
correctly in one of the ones above, please
[open an issue](https://github.com/billinghamj/json-client/issues/new) and we'll
figure it out.

## Support

Please open an issue on this repository.

## Authors

- James Billingham <james@jamesbillingham.com>

## License

MIT licensed - see [LICENSE](LICENSE) file
