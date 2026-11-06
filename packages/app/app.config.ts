import type { ConfigContext, ExpoConfig } from 'expo/config';
import sdk from '../../docs/sdk-levels.json';

/**
 * App configuration (runbook R1, R2). The build profile decides the ABI: a sideloaded `preview` APK is arm64 only,
 * a `production` build has no restriction. SDK levels come from `docs/sdk-levels.json` alone.
 */
const profile = process.env.EAS_BUILD_PROFILE ?? 'local';
const isProd = profile === 'production';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Market Learning',
  slug: 'market-learning',
  version: '0.1.0',
  orientation: 'portrait',
  // Placeholder icon (2026-11-06; tools/app-icon/make_icon.py); the owner will replace it.
  icon: './assets/icon.png',
  web: { bundler: 'metro', output: 'single', favicon: './assets/icon.png' },
  android: {
    package: 'in.sunil.marketlearning',
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#1a56db' },
    versionCode: 1,
    // nothing beyond the internet is needed: files are shared through the system share sheet
    permissions: ['android.permission.INTERNET'],
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.RECORD_AUDIO',
      // added by expo-secure-store for biometric unlock, which the app does not use
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
    ],
  },
  plugins: [
    'expo-sqlite',
    'expo-secure-store',
    'expo-sharing',
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: sdk.minSdkVersion,
          compileSdkVersion: sdk.compileSdkVersion,
          targetSdkVersion: sdk.targetSdkVersion,
          usesCleartextTraffic: false,
          ...(isProd ? {} : { buildArchs: ['arm64-v8a'] }),
        },
      },
    ],
  ],
  extra: { buildProfile: profile },
});
