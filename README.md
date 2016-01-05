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
internally. It attempts to find an implementation with the following process, in
this order:

0. look for a global called `fetch`
0. attempt to require `node-fetch`
0. fail with the error: "fetch implementation missing - see readme"

If you receive the error, you must provide an implementation on the global
before json client is loaded. For example, in a browser environment, this can be
achieved by including a fetch implementation `<script>` tag before including
json client (e.g. [GitHub's](https://github.com/github/fetch) implementation or
another polyfill).

The current situation is fairly inflexible, but is driven by the need to support
both React Native and Node JS without any additional effort. If you would like
the behavior to change to work better for your use case, please
[open an issue](https://github.com/billinghamj/json-client/issues/new) so we can
discuss the possible options.

## Support

Please open an issue on this repository.

## Authors

- James Billingham <james@jamesbillingham.com>

## License

MIT licensed - see [LICENSE](LICENSE) file
