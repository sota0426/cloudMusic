import Entypo from "@expo/vector-icons/Entypo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, ScrollView, Text, View } from "react-native";

WebBrowser.maybeCompleteAuthSession();

interface MicrosoftUser {
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  id?: string;
}

interface StoredAuth {
  user: MicrosoftUser;
  accessToken: string;
  expiresAt: number;
}

export default function MicrosoftSignInScreen() {
  const [microsoftUserInfo, setMicrosoftUserInfo] =
    useState<MicrosoftUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);

  const clientId = "0f7f6cf5-7f64-4ed5-bbff-3f0cb8796763";
  const tenantId = "9c88b83f-6b00-42a9-a985-8091fbea96f3";

  const discovery = {
    authorizationEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
  };

  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId,
      redirectUri: redirectUri,
      scopes: [
        "openid",
        "profile",
        "User.Read",
        "Files.Read",
        "Files.Read.All",
        "offline_access",
      ],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;

      if (code && request) {
        exchangeCodeForToken(code, request.codeVerifier);
      }
    }
  }, [response, request]);

  const exchangeCodeForToken = async (code: string, codeVerifier?: string) => {
    if (!codeVerifier) return;

    setLoading(true);
    try {
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: clientId,
          code,
          redirectUri,
          extraParams: { code_verifier: codeVerifier },
        },
        discovery
      );

      await handleAuthSuccess(
        tokenResponse.accessToken,
        tokenResponse.expiresIn
      );
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const loadStoredAuth = async () => {
    const storedData = await AsyncStorage.getItem("@microsoftAuth");
    if (!storedData) return;

    const authData: StoredAuth = JSON.parse(storedData);

    if (authData.expiresAt > Date.now()) {
      setMicrosoftUserInfo(authData.user);
      setAccessToken(authData.accessToken);
    } else {
      await clearMicrosoftStorage();
    }
  };

  const handleAuthSuccess = async (token: string, expiresIn?: number) => {
    if (!token) return;

    setLoading(true);
    try {
      const user = await getMicrosoftUserInfo(token);

      if (user) {
        const expiresAt =
          Date.now() + (expiresIn || 3600) * 1000;

        await AsyncStorage.setItem(
          "@microsoftAuth",
          JSON.stringify({ user, accessToken: token, expiresAt })
        );

        setMicrosoftUserInfo(user);
        setAccessToken(token);
      }
    } finally {
      setLoading(false);
    }
  };

  const getMicrosoftUserInfo = async (token: string) => {
    try {
      const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return null;

      return response.json();
    } catch {
      return null;
    }
  };

  const fetchOneDriveFiles = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/drive/root/children",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      setFiles(data.value || []);
    } finally {
      setLoading(false);
    }
  };

  const clearMicrosoftStorage = async () => {
    await AsyncStorage.removeItem("@microsoftAuth");
    setMicrosoftUserInfo(null);
    setAccessToken(null);
    setFiles([]);
  };

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      className="px-5 py-10 items-center justify-center"
    >
      {/** Google Login */}
      <Text className="text-2xl font-bold mb-8 text-blue-600">
        <Entypo name="google-drive" size={24}/>
        <Text className="pl-2">Microsoft / OneDrive 認証</Text>
      </Text>

      {loading && <ActivityIndicator size="large" color="#0078d4" />}

      {response && (
        <View className="w-full my-3 p-3 bg-gray-200 rounded">
          <Text>Response Type: {response.type}</Text>
          {response.type === "error" && (
            <Text className="text-red-500 mt-1">
              Error: {response.error?.message}
            </Text>
          )}
        </View>
      )}

      {microsoftUserInfo ? (
        <>
          <View className="w-full my-5 p-4 bg-blue-100 border border-blue-500 rounded">
            <Text className="font-bold text-lg mb-2">ユーザー情報</Text>
            <Text>名前: {microsoftUserInfo.displayName}</Text>
            <Text>
              メール:{" "}
              {microsoftUserInfo.mail ||
                microsoftUserInfo.userPrincipalName}
            </Text>
            <Text>ID: {microsoftUserInfo.id}</Text>
          </View>

          <View className="w-full my-3">
            <Button
              title="OneDriveファイルを取得"
              onPress={fetchOneDriveFiles}
              disabled={loading}
            />
          </View>

          {files.length > 0 && (
            <View className="w-full my-5 p-4 bg-gray-100 rounded max-h-80">
              <Text className="font-bold text-lg mb-2">
                OneDrive ファイル ({files.length}件)
              </Text>

              {files.slice(0, 10).map((file, index) => (
                <Text key={index} className="py-1 text-base">
                  {file.folder ? "📁" : "📄"} {file.name}
                </Text>
              ))}

              {files.length > 10 && (
                <Text className="italic text-gray-600 pt-2">
                  ... 他 {files.length - 10} 件
                </Text>
              )}
            </View>
          )}

          <View className="w-full my-3">
            <Button
              title="ログアウト"
              onPress={clearMicrosoftStorage}
              color="red"
            />
          </View>
        </>
      ) : (
        <View className="w-full my-3">
          <Button
            title="Sign in with Microsoft"
            onPress={() => promptAsync()}
            disabled={!request || loading}
          />
        </View>
      )}
    </ScrollView>
  );
}
