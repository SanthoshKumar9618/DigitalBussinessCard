import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: "WEB_CLIENT_ID.apps.googleusercontent.com",
    androidClientId: "ANDROID_CLIENT_ID.apps.googleusercontent.com",
    iosClientId: "IOS_CLIENT_ID.apps.googleusercontent.com",
    scopes: ["profile", "email"],
  });

  return { request, response, promptAsync };
}
