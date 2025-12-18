import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { Alert, Platform } from "react-native";

// 認証セッションを完了 (ExpoのAuthSessionを使用する場合のおまじない)
WebBrowser.maybeCompleteAuthSession();

// --- 型定義 ---

/** OneDrive上のファイル/フォルダの基本構造 */
export interface OneDriveFile {
  id: string;
  name: string;
  file?: { // ファイルの場合に存在
    mimeType: string;
  };
  folder?: {}; // フォルダの場合に存在
  lastModifiedDateTime?: string;
  parentReference?: {
    driveId: string;
    id: string;
    path: string;
  };
  webUrl?: string; // ブラウザでの表示URL
}

/** Microsoft Graph APIから取得するユーザー情報 */
interface MicrosoftUserInfo {
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  id?: string;
}

/** AsyncStorageに保存する認証データ構造 */
interface StoredAuth {
  user: MicrosoftUserInfo;
  accessToken: string;
  expiresAt: number; // トークンの有効期限 (UNIXタイムスタンプ)
}

// --- 定数 ---

/** AsyncStorageに認証情報を保存するためのキー */
const MICROSOFT_AUTH_STORAGE_KEY = "@microsoftAuth";

/** Microsoft Entra ID (Azure AD) で登録したアプリケーションのクライアントID */
const CLIENT_ID = "0f7f6cf5-7f64-4ed5-bbff-3f0cb8796763";

// 認証が成功した方の設定 (commonテナントを使用)
const AUTHORITY = "https://login.microsoftonline.com/common";

/** OAuth 2.0のエンドポイント情報 */
const DISCOVERY = {
  authorizationEndpoint: `${AUTHORITY}/oauth2/v2.0/authorize`,
  tokenEndpoint: `${AUTHORITY}/oauth2/v2.0/token`,
};

// MicrosoftSignInScreen.tsx のリダイレクトURIロジックを採用
const isWeb = Platform.OS === "web";
const REDIRECT_URI = isWeb
    ? AuthSession.makeRedirectUri({ useProxy: true } as any)
    : "msauth.com.iimorisota.googleAuth://auth"; 


// --- カスタムフック ---
export const useOneDrive = () => {
  const [microsoftUserInfo, setMicrosoftUserInfo] = useState<MicrosoftUserInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<OneDriveFile[]>([]);
  const isAuthenticated = !!microsoftUserInfo;

  // 認証リクエストの準備とレスポンスの取得
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
      // 要求するスコープ (権限)
      scopes: [
        "openid", 
        "profile", 
        "User.Read", 
        "Files.Read", // OneDriveファイルの読み取り
        "offline_access", // リフレッシュトークンの取得を許可
      ],
      responseType: AuthSession.ResponseType.Code, 
      usePKCE: true, 
    },
    DISCOVERY
  );

  /**
   * 🗑️ AsyncStorageとステートから認証情報を削除し、サインアウト状態にする
   */
  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(MICROSOFT_AUTH_STORAGE_KEY);
    setMicrosoftUserInfo(null);
    setAccessToken(null);
    setFiles([]);
  }, []);
  
  /**
   * ✅ アクセストークン取得成功後の処理 (ユーザー情報取得と保存)
   */
  const handleAuthSuccess = useCallback(async (token: string, expiresIn?: number) => {
    if (!token) return;

    setLoading(true);
    try {
      const user = await getMicrosoftUserInfo(token);

      if (user) {
        // トークンの有効期限時刻を計算 (現在時刻 + 有効期限)
        const expiresAt = Date.now() + (expiresIn || 3600) * 1000;

        // 認証情報をAsyncStorageに保存
        await AsyncStorage.setItem(
          MICROSOFT_AUTH_STORAGE_KEY,
          JSON.stringify({ user, accessToken: token, expiresAt })
        );

        // ステートを更新
        setMicrosoftUserInfo(user);
        setAccessToken(token);
      } else {
         // ユーザー情報取得失敗時はログアウト
         await signOut();
      }
    } catch (e) {
      console.error("Auth Success Handler Error:", e);
      await signOut(); // エラー時は強制ログアウト
      Alert.alert("認証エラー", "ユーザー情報の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  /**
   * 🪙 認可コードをアクセストークンと交換する (PKCEを使用)
   */
  const exchangeCodeForToken = useCallback(async (code: string, codeVerifier?: string) => {
    if (!codeVerifier) return;

    setLoading(true);
    try {
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: CLIENT_ID,
          code,
          redirectUri: REDIRECT_URI,
          extraParams: { code_verifier: codeVerifier },
        },
        DISCOVERY
      );

      await handleAuthSuccess(
        tokenResponse.accessToken,
        tokenResponse.expiresIn
      );
    } catch (error) {
      console.error("Token Exchange Error:", error);
      Alert.alert("認証失敗", "認証コードの交換に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, [handleAuthSuccess]);

  /**
   * 🔐 AsyncStorageから認証情報を読み込み、トークンの有効期限を確認する
   */
  const loadStoredAuth = useCallback(async () => {
    const storedData = await AsyncStorage.getItem(MICROSOFT_AUTH_STORAGE_KEY);
    if (!storedData) return;

    const authData: StoredAuth = JSON.parse(storedData);

    // 有効期限をチェック
    if (authData.expiresAt > Date.now()) {
      setMicrosoftUserInfo(authData.user);
      setAccessToken(authData.accessToken);
    } else {
      await signOut(); // 期限切れの場合はクリア
    }
  }, [signOut]);

  // --- useEffects ---

  // 1. 起動時に保存された認証情報をロード
  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  // 2. AuthSessionレスポンスを処理
  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;

      if (code && request) {
        exchangeCodeForToken(code, request.codeVerifier);
      }
    } else if (response?.type === "error") {
      console.error("Authentication Error:", response.error?.message);
      Alert.alert("認証エラー", `サインイン中にエラーが発生しました: ${response.error?.message}`);
    }
  }, [response, request, exchangeCodeForToken]);


  // --- Graph API 関数 ---

  /**
   * 👤 Microsoft Graph APIからユーザーのプロフィール情報を取得
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

      return response.json() as Promise<MicrosoftUserInfo>;
    } catch (error) {
      console.error("User Info Fetch Error:", error);
      return null;
    }
  };

  /**
   * 📂 OneDriveのファイル/フォルダ一覧を取得
   */
  const fetchOneDriveFiles = useCallback(async (parentItemId: string = "root") => {
    const token = accessToken;
    if (!token) return;

    setLoading(true);
    try {
      const endpoint =
        parentItemId === "root"
          ? "https://graph.microsoft.com/v1.0/me/drive/root/children"
          : `https://graph.microsoft.com/v1.0/me/drive/items/${parentItemId}/children`;

      const selectFields = [
        "id", "name", "file", "folder", "lastModifiedDateTime", "parentReference", "webUrl",
      ].join(",");

      const response = await fetch(`${endpoint}?$select=${selectFields}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      const items: OneDriveFile[] = data.value || [];

      // フォルダまたはオーディオファイルにフィルタリング
      const filteredItems = items.filter((item) => {
        const isFolder = !!item.folder;
        // mimeTypeがないファイルは拡張子で判定が難しいので、ここではシンプルにフォルダとMIMEタイプが 'audio/' で始まるもののみを許可
        const isAudio = item.file?.mimeType?.startsWith("audio/");
        return isFolder || isAudio;
      });

      setFiles(filteredItems);
    } catch (error) {
      console.error("OneDrive Fetch Error:", error);
      Alert.alert("ファイル取得エラー", "OneDriveのファイル一覧の取得に失敗しました。");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);


  /**
   * 🔗 ファイルのダウンロード可能な一時URLを取得する
   */
  const getDownloadUrl = useCallback(async (fileId: string): Promise<string | null> => {
    const token = accessToken;
    if (!token) {
      console.error("❌ Access token is not available");
      return null;
    }

    try {
      const url = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}?select=@microsoft.graph.downloadUrl`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Download URL fetch failed:", response.status, errorText);
        Alert.alert("エラー", `ダウンロードURLの取得に失敗しました。ステータス: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const downloadUrl = data["@microsoft.graph.downloadUrl"];
      
      return downloadUrl || null;
    } catch (error) {
      console.error("❌ Download URL fetch error:", error);
      Alert.alert("エラー", "ネットワークエラーによりダウンロードURLを取得できませんでした。");
      return null;
    }
  }, [accessToken]);


  /**
   * 🚀 サインインプロセス (認証画面の表示) を開始する
   */
  const signIn = useCallback(() => {
    if (request) {
      promptAsync();
    } else {
      Alert.alert("エラー", "認証リクエストの準備ができていません。アプリを再起動してください。");
    }
  }, [request, promptAsync]);

  // フックの返り値
  return {
    microsoftUserInfo, 
    accessToken, 
    loading, 
    files, 
    signIn, 
    signOut, 
    fetchOneDriveFiles, 
    getDownloadUrl, 
    isAuthenticated, 
    request, 
    response
  };
};