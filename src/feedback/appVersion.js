export function getAppVersionInfo() {
  return {
    version: process.env.REACT_APP_VERSION || 'dev',
    gitCommit: process.env.REACT_APP_GIT_COMMIT || 'unknown',
    buildTime: process.env.REACT_APP_BUILD_TIME || null,
  };
}
