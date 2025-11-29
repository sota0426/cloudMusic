import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Platform } from "react-native"; // 👈 追加: Web判定用

WebBrowser.maybeCompleteAuthSession();

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  parents?: string[];
  thumbnailLink?: string;
  webContentLink?: string;
}

interface GoogleUserInfo {
  name: string;
  email: string;
  verified_email: boolean;
  id: string;
}

export const useGoogleDrive = () => {
  const [googleUserInfo, setGoogleUserInfo] = useState<GoogleUserInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);

  // 認証リクエストの設定
  const [googleRequest, googleResponse, promptAsync] = Google.useAuthRequest({
    // ⚠️ ご自身のクライアントIDに合わせてください
    androidClientId: "567214050375-70p13dhdknjbebv9uv8cjd7qhjd4bkie.apps.googleusercontent.com",
    iosClientId: "567214050375-4jstuf30dbvr9lfuicf0mk6g3v5smqaa.apps.googleusercontent.com",
    webClientId: "567214050375-6nmenaun0puabssou05m0er5tc7dof77.apps.googleusercontent.com",
    scopes: [
      "openid",
      "profile",
      "email",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
  });

  // 起動時に保存された認証情報をロード
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // 認証レスポンスの処理
  useEffect(() => {
    if (googleResponse?.type === "success") {
      handleAuthSuccess(googleResponse.authentication);
    }
  }, [googleResponse]);

  /**
   * 🔐 保存された認証情報の読み込み (OneDrive版と同様のロジック)
   */
  const loadStoredAuth = async () => {
    const storedData = await AsyncStorage.getItem("@googleAuth");
    if (!storedData) return;

    const authData = JSON.parse(storedData);
    
    // 有効期限チェック (現在時刻より未来であれば有効)
    if (authData.expiresAt > Date.now()) {
      setGoogleUserInfo(authData.user);
      setAccessToken(authData.accessToken);
    } else {
      console.log("⚠️ Googleトークンの有効期限切れ: ログアウト処理を実行します");
      await clearGoogleStorage();
    }
  };

  /**
   * ✅ 認証成功時の処理
   */
  const handleAuthSuccess = async (authentication: any) => {
    if (!authentication?.accessToken) return;

    setLoading(true);
    try {
      const user = await getGoogleUserInfo(authentication.accessToken);

      if (user) {
        // トークン有効期限の計算 (デフォルト3600秒)
        const expiresAt = Date.now() + (authentication.expiresIn || 3600) * 1000;

        const authData = {
          user,
          accessToken: authentication.accessToken,
          expiresAt,
        };

        await AsyncStorage.setItem("@googleAuth", JSON.stringify(authData));
        setGoogleUserInfo(user);
        setAccessToken(authentication.accessToken);
      }
    } finally {
      setLoading(false);
    }
  };

  const getGoogleUserInfo = async (token: string) => {
    try {
      const response = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.json();
    } catch {
      return null;
    }
  };

  /**
   * 📂 ファイル一覧取得
   */
  const fetchGoogleDriveFiles = async (parentFolderId: string = 'root') => {
    if (!accessToken) return;

    setLoading(true);
    try {
      // フォルダまたは音声ファイルを検索
      const query = encodeURIComponent(
        `(mimeType='application/vnd.google-apps.folder' or mimeType contains 'audio/') and '${parentFolderId}' in parents and trashed=false`
      );
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=100&fields=files(id,name,mimeType,modifiedTime,parents,thumbnailLink,webContentLink)&orderBy=folder,name`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      setFiles(data.files || []);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🔗 ダウンロードURLの取得 (ここが最重要修正ポイント)
   * Web環境とNative環境で取得方法を分岐させます。
   */
  const getDownloadUrl = async (fileId: string): Promise<string | null> => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔑 getDownloadUrl() 開始 (Google Drive)");
    
    if (!accessToken) {
      console.error("❌ Access token is not available");
      return null;
    }

    const apiUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    try {
      // ---------------------------------------------------------
      // 🌐 【Webの場合】 FetchしてBlobを作成する
      // OneDriveと違い、GoogleはAPI経由でバイナリを流すため、
      // ブラウザ標準のプレーヤーが直接認証ヘッダー付きでアクセスできません。
      // そのため、JSでデータを取得(fetch)し、Blob URLに変換します。
      // ---------------------------------------------------------
      if (Platform.OS === 'web') {
        console.log("🌐 Web環境: Fetch -> Blob変換を実行");
        
        const response = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          throw new Error(`Fetch failed: ${response.status}`);
        }
        
        const blob = await response.blob();
        // ブラウザメモリ上に一時的なURLを作成 (例: blob:http://localhost:8081/...)
        const blobUrl = URL.createObjectURL(blob);
        console.log("✅ Web用Blob URL生成完了:", blobUrl);
        
        return blobUrl; 
      }

      // ---------------------------------------------------------
      // 📱 【Native (iOS/Android) の場合】
      // ExpoのAVモジュールなどはヘッダーを扱いにくいため、
      // クエリパラメータにaccess_tokenを埋め込む方式を採用します。
      // ---------------------------------------------------------
      console.log("📱 Native環境: トークン付きURLを使用");
      return `${apiUrl}&access_token=${accessToken}`;

    } catch (error) {
      console.error("❌ Download URL fetch error:", error);
      return null;
    }
  };

  const getAccessToken = (): string | null => {
    return accessToken;
  };

  const clearGoogleStorage = async () => {
    await AsyncStorage.removeItem("@googleAuth");
    setGoogleUserInfo(null);
    setAccessToken(null);
    setFiles([]);
  };

  const signIn = () => {
    promptAsync();
  };

  const signOut = () => {
    clearGoogleStorage();
  };

  return {
    googleUserInfo,
    accessToken,
    loading,
    files,
    googleRequest,       // useOneDriveに合わせて追加
    googleResponse, // useOneDriveのresponseに合わせてリネームせずそのまま
    signIn,
    signOut,
    fetchGoogleDriveFiles,
    getDownloadUrl,
    getAccessToken,
    isAuthenticated: !!googleUserInfo,
  };
};