const path = require('path');
const glob = require('glob');
const DIST = path.resolve(__dirname);
const shell = require('shelljs');

const getEntryObject = () => {
  shell.rm('-rf', 'out/src');
  const entryArray = glob.sync('src/**/*.ts');
  const srcObj = entryArray.reduce((acc, item) => {
    const modulePath = item.replace(/\/[\.A-Za-z0-9_-]*\.ts/g, '');
    const outputModulePath = path.join('out', modulePath, 'index');

    if (!acc.hasOwnProperty(outputModulePath)) {
      // webpack requires the object to be in this format
      // { 'out/src/channels/index': './src/channels/index.ts' }
      acc[outputModulePath] = '.' + path.join(path.sep, modulePath, 'index.ts');
    }

    return acc;
  }, {});
  return srcObj;
};

const getMode = () => {
  const webpackMode = process.env.NODE_ENV || 'development';
  console.log(`Running in ${webpackMode} mode`);
  return webpackMode;
};

module.exports = {
  // extensions run in a node context
  target: 'node',
  mode: getMode(),
  entry: getEntryObject(),
  // vsix packaging depends on commonjs2
  output: {
    path: DIST,
    filename: '[name].js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: `webpack:///salesforcedx-vscode-core/[resource-path]`
  },
  // include source maps
  devtool: 'source-map',
  // excluding dependencies from getting bundled
  externals: {
    'adm-zip': 'commonjs adm-zip',
    decache: 'commonjs decache',
    istanbul: 'commonjs istanbul',
    mocha: 'mocha',
    'remap-istanbul': 'commonjs remap-istanbul',
    '@salesforce/core': 'commonjs @salesforce/core',
    '@salesforce/salesforcedx-test-utils-vscode':
      'commonjs @salesforce/salesforcedx-test-utils-vscode',
    'source-map': 'commonjs source-map',
    vscode: 'commonjs vscode',
    'vscode-nls': 'commonjs vscode-nls'
  },
  // Automatically resolve certain extensions.
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  // pre-process certain file types using loaders
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules|\.d\.ts$/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  }
};
