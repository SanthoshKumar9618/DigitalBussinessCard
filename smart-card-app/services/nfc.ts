import { NativeModules } from "react-native";

/**
 * react-native-nfc-manager creates a NativeEventEmitter as soon as it is imported,
 * which throws when its native module is missing (e.g. inside Expo Go). Load it
 * lazily, only when the native module exists, so the rest of the app keeps working.
 */
export const nfcSupportedInThisBuild = !!NativeModules.NfcManager;

type NfcModule = typeof import("react-native-nfc-manager");

let cached: NfcModule | null = null;

export function getNfc(): NfcModule | null {
  if (!nfcSupportedInThisBuild) return null;
  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("react-native-nfc-manager") as NfcModule;
  }
  return cached;
}
