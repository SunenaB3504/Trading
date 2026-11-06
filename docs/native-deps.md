# Native dependencies of the app (runbook R4.4)

*Every native module in `packages/app`, with why it is there. Checked against Expo SDK 58 / React Native 0.88 on 2026-10-26 (all are Expo-maintained modules installed with `npx expo install`, which picks the version made for the SDK). Re-check after every dependency change and before each release.*

| Package | Version | Maintained by | Why it is needed | Added |
| ------ | ------ | ------ | ------ | ------ |
| `expo-sqlite` | ~58.0.14 | Expo | Android storage behind the `KeyValueStore` seam (SSD v4.1 §9) | Stage 1 |
| `expo-secure-store` | ~58.0.2 | Expo | PIN hashes now, AI keys later, in the Android Keystore | Stage 1 |
| `expo-crypto` | ~58.0.7 | Expo | Secure random bytes for the device signing key and profile ids | Stage 1 |
| `expo-file-system` | ~58.0.11 | Expo | Writing the backup file and reading a picked file | Stage 1 |
| `expo-sharing` | ~58.0.20 | Expo | System share sheet to save or send a backup | Stage 1 |
| `expo-build-properties` | ~58.0.11 | Expo | Single-sourced SDK levels, ABI by build profile, cleartext off (R1, R2, R5) | Stage 1 |
| `expo-status-bar` | ~58.0.3 | Expo | Status bar (existing) | before D42 |
| `react-native-safe-area-context` | ~5.11.1 | Expo SDK (bundled version, installed with `npx expo install`) | Status-bar and navigation-bar insets: Android draws edge to edge, so without it the Trade screen's order bar sat under the phone's navigation bar | Stage 2c UI, 2026-11-06 |

`expo-document-picker` was installed while building Stage 1 and removed again: `expo-file-system` can pick files itself. No `expo-dev-client` in any release build (R4.1).
