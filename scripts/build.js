const { execFileSync, spawnSync } = require('child_process');
const path = require('path');
const packageJson = require('../package.json');

function readGitCommit() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (error) {
    return 'unknown';
  }
}

const reactScripts = require.resolve('react-scripts/bin/react-scripts.js');
const env = {
  ...process.env,
  REACT_APP_VERSION: packageJson.version,
  REACT_APP_GIT_COMMIT: readGitCommit(),
  REACT_APP_BUILD_TIME: new Date().toISOString(),
};

const result = spawnSync(process.execPath, [reactScripts, 'build'], {
  cwd: path.resolve(__dirname, '..'),
  env,
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
