import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";

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

  const [googleRequest, googleResponse, googlePromptAsync] =
    Google.useAuthRequest({
      androidClientId:
        "567214050375-70p13dhdknjbebv9uv8cjd7qhjd4bkie.apps.googleusercontent.com",
      iosClientId:
        "567214050375-4jstuf30dbvr9lfuicf0mk6g3v5smqaa.apps.googleusercontent.com",
      webClientId:
        "567214050375-6nmenaun0puabssou05m0er5tc7dof77.apps.googleusercontent.com",
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
      await clearGoogleStorage();
    }
  };

  const handleAuthSuccess = async (authentication: any) => {
    if (!authentication?.accessToken) return;

    setLoading(true);
    try {
      const user = await getGoogleUserInfo(authentication.accessToken);

      if (user) {
        const expiresAt =
          Date.now() + (authentication.expiresIn || 3600) * 1000;

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
      const response = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

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

  /**
   * 💡 新規追加: ダウンロード可能なURLを取得
   * Google Driveの場合、webContentLinkまたはダウンロード用URLを生成
   */
  const getDownloadUrl = async (fileId: string): Promise<string | null> => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔑 getDownloadUrl() 開始 (Google Drive)");
    console.log("🆔 ファイルID:", fileId);
    console.log("🔐 アクセストークン存在:", !!accessToken);
    
    if (!accessToken) {
      console.error("❌ Access token is not available");
      return null;
    }

    try {
      // Google Driveのダウンロード用URL
      // alt=media パラメータで直接ファイルコンテンツを取得
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      console.log("🌐 ダウンロードURL:", url);
      
      // 認証ヘッダー付きのURLを返す
      // expo-audio では直接認証ヘッダーを渡せないため、
      // 一時的なアクセス可能なURLが必要
      // Google Driveの場合、アクセストークンをURLに含める方法もあるが、
      // セキュリティ上推奨されないため、代わりに webContentLink を使用
      
      // ファイル情報を再取得して webContentLink を確認
      const fileInfoResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webContentLink,name,mimeType`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      console.log("📡 レスポンスステータス:", fileInfoResponse.status);

      if (!fileInfoResponse.ok) {
        const errorText = await fileInfoResponse.text();
        console.error("❌ File info fetch failed:", fileInfoResponse.status);
        console.error("❌ エラーレスポンス:", errorText);
        return null;
      }

      const fileData = await fileInfoResponse.json();
      console.log("📦 ファイル情報:", JSON.stringify(fileData, null, 2));

      // webContentLink がある場合はそれを使用
      if (fileData.webContentLink) {
        console.log("🔗 webContentLink使用:", fileData.webContentLink);
        console.log("✅ getDownloadUrl() 完了");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return fileData.webContentLink;
      }

      // webContentLink がない場合、直接ダウンロードURLを使用
      // ただし、認証が必要なため、アクセストークンをクエリパラメータとして追加
      const downloadUrlWithToken = `${url}&access_token=${accessToken}`;
      console.log("🔗 認証付きURL使用");
      console.log("✅ getDownloadUrl() 完了");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      return downloadUrlWithToken;
    } catch (error) {
      console.error("❌ Download URL fetch error:", error);
      console.error("❌ エラー詳細:", JSON.stringify(error, null, 2));
      return null;
    }
  };

  /**
   * 💡 新規追加: アクセストークンを取得
   */
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
    googlePromptAsync();
  };

  const signOut = () => {
    clearGoogleStorage();
  };

  return {
    googleUserInfo,
    accessToken,
    loading,
    files,
    googleRequest,
    googleResponse,
    signIn,
    signOut,
    fetchGoogleDriveFiles,
    getDownloadUrl, // 💡 追加
    getAccessToken, // 💡 追加
    isAuthenticated: !!googleUserInfo,
  };
};