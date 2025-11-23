import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";

WebBrowser.maybeCompleteAuthSession();

// 💡 修正後の GoogleDriveFile インターフェース
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

  const fetchGoogleDriveFiles = async (parentFolderId: string = 'root') => { // 💡 parentFolderId を引数に追加
    if (!accessToken) return;

    setLoading(true);
    try {
      // 💡 クエリ修正: 現在のフォルダの子要素に限定
      const query = encodeURIComponent(
        `(mimeType='application/vnd.google-apps.folder' or mimeType contains 'audio/') and '${parentFolderId}' in parents and trashed=false`
      );
      
      // 💡 fields 修正: parents, thumbnailLink, webContentLink を追加
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
    isAuthenticated: !!googleUserInfo,
  };
};