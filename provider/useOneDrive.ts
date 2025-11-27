// useOneDrive.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import { useEffect, useState } from "react";

// --- 型定義 ---
export interface OneDriveFile {
  id: string;
  name: string;
  file?: {
    mimeType: string;
  };
  folder?: {};
  lastModifiedDateTime?: string;
  parentReference?: {
    driveId: string;
    id: string;
    path: string;
  };
  webUrl?: string;
}

interface MicrosoftUserInfo {
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  id?: string;
}

interface StoredAuth {
  user: MicrosoftUserInfo;
  accessToken: string;
  expiresAt: number;
}

// --- 定数 ---
const MICROSOFT_AUTH_STORAGE_KEY = "@microsoftAuth";

const CLIENT_ID = "0f7f6cf5-7f64-4ed5-bbff-3f0cb8796763";
const TENANT_ID = "9c88b83f-6b00-42a9-a985-8091fbea96f3";

const DISCOVERY = {
  authorizationEndpoint: `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
};

const REDIRECT_URI = AuthSession.makeRedirectUri();

// --- カスタムフック ---
export const useOneDrive = () => {
  const [microsoftUserInfo, setMicrosoftUserInfo] =
    useState<MicrosoftUserInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<OneDriveFile[]>([]);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
      scopes: [
        "openid",
        "profile",
        "User.Read",
        "Files.Read",
        "offline_access",
      ],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    DISCOVERY
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
    } finally {
      setLoading(false);
    }
  };

  const loadStoredAuth = async () => {
    const storedData = await AsyncStorage.getItem(MICROSOFT_AUTH_STORAGE_KEY);
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
        const expiresAt = Date.now() + (expiresIn || 3600) * 1000;

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

  const fetchOneDriveFiles = async (parentItemId: string = "root") => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const endpoint =
        parentItemId === "root"
          ? "https://graph.microsoft.com/v1.0/me/drive/root/children"
          : `https://graph.microsoft.com/v1.0/me/drive/items/${parentItemId}/children`;

      const selectFields = [
        "id",
        "name",
        "file",
        "folder",
        "lastModifiedDateTime",
        "parentReference",
        "webUrl",
      ].join(",");

      const response = await fetch(`${endpoint}?$select=${selectFields}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json();
      const items: OneDriveFile[] = data.value || [];

      const filteredItems = items.filter((item) => {
        const isFolder = !!item.folder;
        const isAudio = item.file?.mimeType?.startsWith("audio/");
        return isFolder || isAudio;
      });

      setFiles(filteredItems);
    } catch (error) {
      console.error("OneDrive Fetch Error:", error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 💡 新規追加: ダウンロード可能なURLを取得
   */
  const getDownloadUrl = async (fileId: string): Promise<string | null> => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔑 getDownloadUrl() 開始");
    console.log("🆔 ファイルID:", fileId);
    console.log("🔐 アクセストークン存在:", !!accessToken);
    console.log("🔐 トークンの最初の20文字:", accessToken?.substring(0, 20));
    
    if (!accessToken) {
      console.error("❌ Access token is not available");
      return null;
    }

    try {
      const url = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}?select=@microsoft.graph.downloadUrl`;
      console.log("🌐 リクエストURL:", url);
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log("📡 レスポンスステータス:", response.status);
      console.log("📡 レスポンスOK:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Download URL fetch failed:", response.status);
        console.error("❌ エラーレスポンス:", errorText);
        return null;
      }

      const data = await response.json();
      console.log("📦 レスポンスデータ:", JSON.stringify(data, null, 2));
      
      const downloadUrl = data["@microsoft.graph.downloadUrl"];
      console.log("🔗 ダウンロードURL:", downloadUrl);
      console.log("✅ getDownloadUrl() 完了");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      return downloadUrl || null;
    } catch (error) {
      console.error("❌ Download URL fetch error:", error);
      console.error("❌ エラー詳細:", JSON.stringify(error, null, 2));
      return null;
    }
  };

  /**
   * 💡 新規追加: アクセストークンを外部から取得可能に
   */
  const getAccessToken = (): string | null => {
    return accessToken;
  };

  const clearMicrosoftStorage = async () => {
    await AsyncStorage.removeItem(MICROSOFT_AUTH_STORAGE_KEY);
    setMicrosoftUserInfo(null);
    setAccessToken(null);
    setFiles([]);
  };

  const signIn = () => {
    promptAsync();
  };

  const signOut = () => {
    clearMicrosoftStorage();
  };

  return {
    microsoftUserInfo,
    accessToken,
    loading,
    files,
    request,
    response,
    signIn,
    signOut,
    fetchOneDriveFiles,
    getDownloadUrl, // 💡 追加
    getAccessToken, // 💡 追加
    isAuthenticated: !!microsoftUserInfo,
  };
};