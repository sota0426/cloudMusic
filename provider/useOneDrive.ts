// OneDrive File (DriveItem) のインターフェース
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
    id: string; // 親フォルダのID
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

// Microsoft Entra ID (旧 Azure AD) の設定
// ⚠️ 実際のアプリケーションでは、これらのIDをセキュアな方法で管理してください
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
        "Files.Read", // OneDriveアクセスに必要
        "offline_access",
      ],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    DISCOVERY
  );

  // 1. 起動時に保存された認証情報をロード
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // 2. AuthSessionレスポンスを処理 (Code Exchange)
  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;

      if (code && request) {
        exchangeCodeForToken(code, request.codeVerifier);
      }
    }
  }, [response, request]);

  /**
   * CodeをAccess Tokenに交換
   */
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
   * OneDriveのファイルまたはフォルダ一覧を取得
   * @param parentItemId 親フォルダのID。デフォルトは 'root'。
   */
  const fetchOneDriveFiles = async (parentItemId: string = "root") => {
    if (!accessToken) return;

    setLoading(true);
    try {
      // 💡 OneDriveのアイテム一覧取得エンドポイント
      // parentItemId が 'root' の場合は /me/drive/root/children
      // それ以外の場合は /me/drive/items/{parentItemId}/children
      const endpoint =
        parentItemId === "root"
          ? "https://graph.microsoft.com/v1.0/me/drive/root/children"
          : `https://graph.microsoft.com/v1.0/me/drive/items/${parentItemId}/children`;

      // 💡 select句で必要なフィールドのみを取得 (Google Driveのfieldsに相当)
      // フォルダとオーディオファイルのみをフィルタリングするクエリパラメータは標準で存在しないため、
      // 取得後にクライアント側でフィルタリングするか、サーバー側フィルタリングの制限を受け入れる必要があります。
      // 今回はシンプルに全ファイル・フォルダを取得し、Google Driveのロジックに合わせるため、
      // 'file'と'folder'プロパティをチェックしてフォルダとオーディオファイルに近いものを抽出します。
      const selectFields = [
        "id",
        "name",
        "file", // mimeTypeはこの中に含まれる
        "folder", // フォルダかどうか
        "lastModifiedDateTime",
        "parentReference",
        "webUrl",
      ].join(",");

      const response = await fetch(
        `${endpoint}?$select=${selectFields}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      const items: OneDriveFile[] = data.value || [];

      // Google Driveの例に倣い、フォルダとオーディオファイル（っぽいもの）のみをフィルタリング
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
   * ストレージとステートから認証情報をクリア（ログアウト）
   */
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
    isAuthenticated: !!microsoftUserInfo,
  };
};