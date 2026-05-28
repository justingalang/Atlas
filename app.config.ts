import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Atlas",
  slug: "atlas",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  scheme: "atlas",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.pogi.atlas",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: ["@react-native-community/datetimepicker", "expo-font"],
  owner: "justingalang",
  updates: {
    url: "https://u.expo.dev/816d7e9d-121a-4a30-9d04-d00bf1157fcf",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  extra: {
    eas: {
      projectId: "816d7e9d-121a-4a30-9d04-d00bf1157fcf",
    },
  },
});
