process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';
process.env.PUBLIC_URL = process.env.PUBLIC_URL || '';

process.on('unhandledRejection', (err) => {
  throw err;
});

const webpack = require('webpack');
const fs = require('fs-extra');
const configFactory = require('react-scripts/config/webpack.config');
const paths = require('react-scripts/config/paths');
const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages');

const SUPABASE_RT_WARNING = /Critical dependency: the request of a dependency is an expression/;
const SUPABASE_RT_MODULE = /@supabase\/realtime-js\/dist\/module\/lib\/websocket-factory\.js/;

const config = configFactory('production');

// Keep behavior aligned with CRA build: clean output and copy /public files
// (except index.html, which HtmlWebpackPlugin emits).
fs.emptyDirSync(paths.appBuild);
copyPublicFolder();

const isIgnorableSupabaseWarning = (warning) => {
  const message = typeof warning === 'string' ? warning : warning.message || '';
  const moduleName = typeof warning === 'string'
    ? ''
    : `${warning.moduleName || ''} ${warning.moduleIdentifier || ''}`;

  return SUPABASE_RT_WARNING.test(message) && SUPABASE_RT_MODULE.test(moduleName);
};

webpack(config, (err, stats) => {
  if (err) {
    console.error(err.message || err);
    process.exit(1);
  }

  const statsJson = stats.toJson({
    all: false,
    warnings: true,
    errors: true,
    errorDetails: true,
    moduleTrace: true
  });

  statsJson.warnings = (statsJson.warnings || []).filter(
    (warning) => !isIgnorableSupabaseWarning(warning)
  );

  const messages = formatWebpackMessages(statsJson);

  if (messages.errors.length > 0) {
    console.error(messages.errors.join('\n\n'));
    process.exit(1);
  }

  const isCI = process.env.CI && process.env.CI.toLowerCase() !== 'false';
  if (isCI && messages.warnings.length > 0) {
    console.error('\nTreating warnings as errors because process.env.CI = true.\n');
    console.error(messages.warnings.join('\n\n'));
    process.exit(1);
  }

  if (messages.warnings.length > 0) {
    console.log('Compiled with warnings.\n');
    console.log(messages.warnings.join('\n\n'));
  } else {
    console.log('Compiled successfully.');
  }
});

function copyPublicFolder() {
  fs.copySync(paths.appPublic, paths.appBuild, {
    dereference: true,
    filter: (file) => file !== paths.appHtml
  });
}
