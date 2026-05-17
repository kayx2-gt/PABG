const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support .cjs files used by Firebase SDK
config.resolver.sourceExts.push('cjs');

// IMPORTANT: Disable package exports resolution.
// Expo SDK 54 enables this by default, but it conflicts with Firebase's
// internal module resolution, causing "Component auth has not been registered yet".
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
