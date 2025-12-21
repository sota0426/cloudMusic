import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

// ✅ レガシーAPIをインポート
import {
  cacheDirectory,
  createDownloadResumable,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  readDirectoryAsync,
} from 'expo-file-system/legacy';

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🔍 Legacy FileSystem 確認:");
console.log("documentDirectory:", documentDirectory);
console.log("cacheDirectory:", cacheDirectory);
console.log("Platform:", Platform.OS);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

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

  const [googleRequest, googleResponse, promptAsync] = Google.useAuthRequest({
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

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (googleResponse?.type === "success") {
      handleAuthSuccess(googleResponse.authentication);
    }
  }, [googleResponse]);

  const loadStoredAuth = async () => {
    const storedData = await AsyncStorage.getItem("@googleAuth");
    if (!storedData) return;

    const authData = JSON.parse(storedData);
    
    if (authData.expiresAt > Date.now()) {
      setGoogleUserInfo(authData.user);
      setAccessToken(authData.accessToken);
    } else {
      console.log("⚠️ Googleトークンの有効期限切れ: ログアウト処理を実行します");
      await clearGoogleStorage();
    }
  };

  const handleAuthSuccess = async (authentication: any) => {
    if (!authentication?.accessToken) return;

    setLoading(true);
    try {
      const user = await getGoogleUserInfo(authentication.accessToken);

      if (user) {
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

  const fetchGoogleDriveFiles = async (parentFolderId: string = 'root') => {
    if (!accessToken) return;

    setLoading(true);
    try {
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

  const getDownloadUrl = async (fileId: string): Promise<string | null> => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔑 getDownloadUrl() 開始 (Google Drive)");
    
    if (!accessToken) {
      console.error("❌ Access token is not available");
      return null;
    }

    const apiUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    try {
      if (Platform.OS === 'web') {
        console.log("🌐 Web環境: Fetch -> Blob変換を実行");
        
        const response = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          throw new Error(`Fetch failed: ${response.status}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        console.log("✅ Web用Blob URL生成完了:", blobUrl);
        
        return blobUrl; 
      }

      console.warn("⚠️ Native環境ではdownloadToLocalを使用してください");
      return null;

    } catch (error) {
      console.error("❌ Download URL fetch error:", error);
      return null;
    }
  };

  const downloadToLocal = async (fileId: string, fileName: string): Promise<string | null> => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 downloadToLocal() 開始");
    console.log("📁 ファイル名:", fileName);

    if (!accessToken) {
      console.error("❌ Access token is not available");
      return null;
    }

    if (Platform.OS === 'web') {
      console.warn("⚠️ Web環境ではgetDownloadUrlを使用してください");
      return null;
    }

    // ✅ レガシーAPIでは documentDirectory が直接使える
    const baseDirectory = documentDirectory || cacheDirectory;
    
    if (!baseDirectory) {
      console.error("❌ ディレクトリが利用できません");
      return null;
    }

    console.log("✅ 使用するディレクトリ:", baseDirectory);
    
    const apiUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileUri = baseDirectory + sanitizedFileName;
    
    console.log("📂 保存先URI:", fileUri);
    
    try {
      // キャッシュチェック
      console.log("🔍 キャッシュチェック中...");
      const fileInfo = await getInfoAsync(fileUri);
      console.log("ℹ️ ファイル情報:", fileInfo);
      
      if (fileInfo.exists) {
        console.log("✅ キャッシュヒット:", sanitizedFileName);
        return fileUri;
      }
      
      // ダウンロード
      console.log("⬇️ ダウンロード開始...");
      const downloadResumable = createDownloadResumable(
        apiUrl,
        fileUri,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      console.log("⏳ ダウンロード実行中...");
      const result = await downloadResumable.downloadAsync();
      
      console.log("📊 ダウンロード結果:", result);
      
      if (!result) {
        throw new Error("ダウンロード失敗: result is null");
      }
      
      console.log("✅ ダウンロード完了:", result.uri);
      return result.uri;
      
    } catch (error) {
      console.error("❌ ダウンロードエラー詳細:");
      console.error("  - エラー:", error);
      console.error("  - メッセージ:", (error as Error).message);
      return null;
    }
  };

  const clearCache = async () => {
    if (Platform.OS === 'web') {
      console.log("🌐 Web環境: キャッシュクリアはスキップ");
      return;
    }

    const baseDirectory = documentDirectory || cacheDirectory;
    
    if (!baseDirectory) {
      console.warn("⚠️ ディレクトリが利用できません");
      return;
    }

    try {
      const dirInfo = await getInfoAsync(baseDirectory);
      if (dirInfo.exists) {
        const filesList = await readDirectoryAsync(baseDirectory);
        console.log(`🗑️ ${filesList.length}個のキャッシュファイルを削除します`);
        
        for (const file of filesList) {
          await deleteAsync(baseDirectory + file, {
            idempotent: true
          });
        }
        console.log("✅ キャッシュクリア完了");
      }
    } catch (error) {
      console.error("❌ キャッシュクリアエラー:", error);
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

  /**
   * 🔐 通常のサインイン
   */
  const signIn = () => {
    console.log("🔐 サインイン開始");
    promptAsync();
  };

  /**
   * 🚪 ログアウト（完全なセッションクリア）
   */
  const signOut = async () => {
    console.log("🚪 ログアウト開始");
    
    // 1. キャッシュをクリア
    await clearCache();
    
    // 2. ストレージをクリア
    await clearGoogleStorage();
    
    // 3. Web環境の場合、認証セッションを完全にクリア
    if (Platform.OS === 'web') {
      try {
        // ブラウザを閉じる
        await WebBrowser.dismissBrowser();
        
        // Google のログアウトURLにアクセスしてセッションをクリア
        // これによりブラウザ側のGoogle認証キャッシュもクリアされる
        await WebBrowser.openBrowserAsync(
          'https://accounts.google.com/Logout',
          { createTask: false }
        );
      } catch (error) {
        console.log("ℹ️ ブラウザセッションクリアスキップ:", error);
      }
    }
    
    console.log("✅ ログアウト完了");
  };

  /**
   * 🔄 アカウント切り替え（ログアウト→再サインイン）
   */
  const switchAccount = async () => {
    console.log("🔄 アカウント切り替え開始");
    
    // 1. 完全ログアウト
    await signOut();
    
    // 2. 少し待ってから再サインイン
    // ログアウト後すぐだとセッションが残っている可能性があるため
    setTimeout(() => {
      console.log("🔐 再サインイン開始");
      promptAsync();
    }, 1000);
  };

  return {
    googleUserInfo,
    accessToken,
    loading,
    files,
    googleRequest,
    googleResponse,
    signIn,
    switchAccount,
    signOut,
    fetchGoogleDriveFiles,
    getDownloadUrl,
    downloadToLocal,
    clearCache,
    getAccessToken,
    isAuthenticated: !!googleUserInfo,
  };
};