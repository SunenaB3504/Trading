const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// the bundled price history is a plain file inside the app, not JavaScript (MIP v4.1 Stage 2)
config.resolver.assetExts.push('market');

module.exports = config;
