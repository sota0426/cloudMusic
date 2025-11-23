import Entypo from "@expo/vector-icons/Entypo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, Text, View } from "react-native";

// 認証セッションを完了
WebBrowser.maybeCompleteAuthSession();

// --- 型定義 ---
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

interface MicrosoftSignInScreenProps {
  onAuthSuccess: () => void;
}

// --- 定数 ---
const MICROSOFT_AUTH_STORAGE_KEY = "@microsoftAuth";

// --- メインコンポーネント ---
export default function MicrosoftSignInScreen({
  onAuthSuccess,
}: MicrosoftSignInScreenProps) {
  const [microsoftUserInfo, setMicrosoftUserInfo] =
    useState<MicrosoftUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Microsoft Entra ID (旧 Azure AD) の設定
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
        "Files.Read", // OneDriveアクセスに必要
        "offline_access",
      ],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  // 1. 起動時に保存された認証情報をロード
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // 2. AuthSessionレスポンスを処理
  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;

      if (code && request) {
        exchangeCodeForToken(code, request.codeVerifier);
      }
    }
  }, [response, request]);

  // 3. 認証情報が設定されたら成功コールバックを実行 (GoogleSignInScreenと同様のロジック)
  useEffect(() => {
    if (microsoftUserInfo && accessToken) {
      onAuthSuccess();
    }
  }, [microsoftUserInfo, accessToken, onAuthSuccess]);

  /**
   * CodeをAccess Tokenに交換
   */
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
      console.error("Token Exchange Error:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 保存された認証情報をロード
   */
  const loadStoredAuth = async () => {
    const storedData = await AsyncStorage.getItem(MICROSOFT_AUTH_STORAGE_KEY);
    if (!storedData) return;

    const authData: StoredAuth = JSON.parse(storedData);

    // 有効期限をチェック
    if (authData.expiresAt > Date.now()) {
      setMicrosoftUserInfo(authData.user);
      setAccessToken(authData.accessToken);
    } else {
      await clearMicrosoftStorage(); // 期限切れの場合はクリア
    }
  };

  /**
   * 認証成功時の処理
   */
  const handleAuthSuccess = async (token: string, expiresIn?: number) => {
    if (!token) return;

    setLoading(true);
    try {
      const user = await getMicrosoftUserInfo(token);

      if (user) {
        const expiresAt = Date.now() + (expiresIn || 3600) * 1000;

        // 認証情報を保存
        await AsyncStorage.setItem(
          MICROSOFT_AUTH_STORAGE_KEY,
          JSON.stringify({ user, accessToken: token, expiresAt })
        );

        setMicrosoftUserInfo(user);
        setAccessToken(token);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Microsoft Graphからユーザー情報を取得
   */
  const getMicrosoftUserInfo = async (token: string) => {
    try {
      const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        console.error(
          "User Info Fetch Failed:",
          response.status,
          await response.text()
        );
        return null;
      }

      return response.json();
    } catch (error) {
      console.error("User Info Fetch Error:", error);
      return null;
    }
  };

  /**
   * ストレージとステートから認証情報をクリア（ログアウト）
   */
  const clearMicrosoftStorage = async () => {
    await AsyncStorage.removeItem(MICROSOFT_AUTH_STORAGE_KEY);
    setMicrosoftUserInfo(null);
    setAccessToken(null);
  };

  // --- UI ---
  return (
    <View className="flex-1 px-5 py-10 items-center justify-center">
      {/* ヘッダー */}
      <Text className="text-2xl font-bold mb-8 text-blue-600">
        <Entypo name="cloud" size={24} /> {/* OneDriveっぽいアイコン */}
        <Text className="pl-2">Microsoft / OneDrive 認証</Text>
      </Text>

      {/* ローディングインジケータ */}
      {loading && <ActivityIndicator size="large" color="#0078d4" />}

      {/* エラーメッセージ表示 */}
      {response && response.type === "error" && (
        <View className="my-3 p-3 bg-gray-200 rounded w-full">
          <Text>Response Type: {response.type}</Text>
          <Text className="text-red-500 mt-1">
            Error: {response.error?.message}
          </Text>
        </View>
      )}

      {/* 認証済みUI */}
      {microsoftUserInfo ? (
        <>
          {/* ユーザー情報表示 */}
          <View className="w-full my-5 p-4 bg-blue-100 border border-blue-500 rounded">
            <Text className="font-bold text-lg mb-2">ユーザー情報</Text>
            <Text>名前: {microsoftUserInfo.displayName}</Text>
            <Text>
              メール:{" "}
              {microsoftUserInfo.mail || microsoftUserInfo.userPrincipalName}
            </Text>
            <Text>ID: {microsoftUserInfo.id}</Text>
            {/* Microsoft GraphのレスポンスにはGoogleのようなverified_emailフィールドがないため、メール認証済みの表示は省略 */}
            <Text className="text-green-600 font-bold mt-1">
              ✓ 認証成功
            </Text>
          </View>

          {/* ログアウトボタン */}
          <View className="w-full my-3">
            <Button
              title="ログアウト"
              onPress={clearMicrosoftStorage}
              color="red"
              disabled={loading}
            />
          </View>
        </>
      ) : (
        /* 未認証UI */
        <View className="w-full my-3">
          <Button
            title="Sign in with Microsoft"
            onPress={() => promptAsync()}
            disabled={!request || loading}
            color="#0078d4" // Microsoftのコーポレートカラー
          />
        </View>
      )}
    </View>
  );
}