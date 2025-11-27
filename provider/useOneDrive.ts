// useOneDrive.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import { useEffect, useState } from "react";

/**
 * 🎣 カスタムフック useOneDrive
 * Microsoft OneDriveとの認証、ファイル操作を行うためのロジックを提供します。
 * OAuth 2.0 (PKCE) フローを使用してアクセストークンを取得・管理し、
 * Microsoft Graph APIを通じてファイル一覧の取得やダウンロードURLの取得を行います。
 */

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
/** テナントID (コンシューマーアカウントの場合は common などを使用することもある) */
const TENANT_ID = "9c88b83f-6b00-42a9-a985-8091fbea96f3";

/** OAuth 2.0のエンドポイント情報 */
const DISCOVERY = {
  authorizationEndpoint: `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
};

/** 認証後のリダイレクトURIをExpoが自動生成 */
const REDIRECT_URI = AuthSession.makeRedirectUri();

// --- カスタムフック ---
export const useOneDrive = () => {
  const [microsoftUserInfo, setMicrosoftUserInfo] = useState<MicrosoftUserInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<OneDriveFile[]>([]);

  // AuthSessionフック: 認証リクエストの準備とレスポンスの取得
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
      // 要求するスコープ (権限)
      scopes: [
        "openid", // 認証
        "profile", // 基本プロフィール
        "User.Read", // ユーザー情報読み取り
        "Files.Read", // OneDriveファイルの読み取り
        "offline_access", // リフレッシュトークンの取得を許可
      ],
      responseType: AuthSession.ResponseType.Code, // 認可コードフローを使用
      usePKCE: true, // セキュリティ強化のためPKCEを使用
    },
    DISCOVERY
  );

  /**
   * 💡 最初のマウント時にAsyncStorageから保存された認証情報を読み込む
   */
  useEffect(() => {
    loadStoredAuth();
  }, []);

  /**
   * 🔐 AsyncStorageから認証情報を読み込み、トークンの有効期限を確認する
   */
  const loadStoredAuth = async () => {
    const storedData = await AsyncStorage.getItem(MICROSOFT_AUTH_STORAGE_KEY);
    if (!storedData) return;

    const authData: StoredAuth = JSON.parse(storedData);
    console.log("🔐 Stored auth data found:", authData);

    // トークンがまだ有効期限内の場合
    if (authData.expiresAt > Date.now()) {
      setMicrosoftUserInfo(authData.user);
      setAccessToken(authData.accessToken);
    } else {
      // 期限切れの場合はクリア
      await clearMicrosoftStorage();
    }
  };

  /**
   * 🔑 認証画面からのレスポンスを処理し、認可コードをトークンと交換する
   */
  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;
      if (code && request) {
        exchangeCodeForToken(code, request.codeVerifier);
      }
    }
  }, [response, request]);

  /**
   * 🪙 認可コードをアクセストークンと交換する (PKCEを使用)
   * @param code 認可コード
   * @param codeVerifier PKCEのコードベリファイア
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

      // トークン取得後の処理へ
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
   * ✅ アクセストークン取得成功後の処理 (ユーザー情報取得と保存)
   * @param token 取得したアクセストークン
   * @param expiresIn トークンの有効期限（秒）
   */
  const handleAuthSuccess = async (token: string, expiresIn?: number) => {
    if (!token) return;

    setLoading(true);
    try {
      // ユーザー情報を取得
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
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 👤 Microsoft Graph APIからユーザーのプロフィール情報を取得
   * @param token アクセストークン
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
   * 📂 OneDriveのファイル/フォルダ一覧を取得
   * @param parentItemId 親フォルダのID (デフォルトは "root")
   */
  const fetchOneDriveFiles = async (parentItemId: string = "root") => {
    if (!accessToken) return;

    setLoading(true);
    try {
      // エンドポイントをルートまたは特定のフォルダIDによって切り替える
      const endpoint =
        parentItemId === "root"
          ? "https://graph.microsoft.com/v1.0/me/drive/root/children"
          : `https://graph.microsoft.com/v1.0/me/drive/items/${parentItemId}/children`;

      // 取得するフィールドを限定し、レスポンスサイズを削減
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

      // フォルダまたはオーディオファイルにフィルタリング
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
   * 🔗 ファイルのダウンロード可能な一時URLを取得する
   * @param fileId ダウンロードしたいファイルのID
   * @returns ダウンロードURL (文字列) または null
   */

  const getDownloadUrl = async (fileId: string): Promise<string | null> => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔑 getDownloadUrl() 開始");
    
    if (!accessToken) {
      console.error("❌ Access token is not available");
      return null;
    }

    try {
      // Graph APIの @microsoft.graph.downloadUrl プロパティを選択してリクエスト
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
      
      return downloadUrl || null;
    } catch (error) {
      console.error("❌ Download URL fetch error:", error);
      console.error("❌ エラー詳細:", JSON.stringify(error, null, 2));
      return null;
    }
  };

  /**
   * 💡 新規追加: アクセストークンを外部から取得可能に
   * @returns 現在のアクセストークン
   */
  const getAccessToken = (): string | null => {
    return accessToken;
  };

  /**
   * 🗑️ AsyncStorageとステートから認証情報を削除し、サインアウト状態にする
   */
  const clearMicrosoftStorage = async () => {
    await AsyncStorage.removeItem(MICROSOFT_AUTH_STORAGE_KEY);
    setMicrosoftUserInfo(null);
    setAccessToken(null);
    setFiles([]);
  };

  /**
   * 🚀 サインインプロセス (認証画面の表示) を開始する
   */
  const signIn = () => {
    promptAsync();
  };

  /**
   * 🚪 サインアウト処理を実行する
   */
  const signOut = async () => {
    await AsyncStorage.removeItem(MICROSOFT_AUTH_STORAGE_KEY);
    setMicrosoftUserInfo(null);
    setAccessToken(null);
    setFiles([]);
  };

  // フックの返り値
  return {
    microsoftUserInfo, // ユーザー情報
    accessToken, // アクセストークン
    loading, // ローディング状態
    files, // ファイル一覧
    request,
    response,
    signIn, // サインイン関数
    signOut, // サインアウト関数
    fetchOneDriveFiles, // ファイル取得関数
    getDownloadUrl, // ダウンロードURL取得関数
    getAccessToken, // アクセストークン取得関数
    isAuthenticated: !!microsoftUserInfo, // 認証済みかどうかのフラグ
  };
};