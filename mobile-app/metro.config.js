// Sentry's wrapper is a drop-in for expo's getDefaultConfig; it adds the
// source-map customizations Sentry needs to symbolicate release builds.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getSentryExpoConfig(projectRoot);

// Watch the shared package for changes
config.watchFolders = [monorepoRoot];

// Resolve packages from both the app and the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// The monorepo root also holds the Next.js web app, whose build output is
// large and none of Metro's business. Keep Metro from crawling it.
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList) ? existingBlockList : existingBlockList ? [existingBlockList] : []),
  /[/\\]web-app[/\\].*/,
];

module.exports = config;
