var path = require('path');
module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'json-client.min.js',
    library: 'jsonClient',
    libraryTarget: 'umd'
  }
};