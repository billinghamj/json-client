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
internally. It does this via the
[`fetch-everywhere`](https://github.com/lucasfeliciano/fetch-everywhere)
package.

In theory, `fetch-everywhere` should support all environments. If yours isn't
yet covered, please open an issue on the repo.

## Support

Please open an issue on this repository.

## Authors

- James Billingham <james@jamesbillingham.com>

## License

MIT licensed - see [LICENSE](LICENSE) file
