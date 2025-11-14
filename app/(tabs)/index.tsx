import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

interface GoogleUser {
  id?: string;
  email?: string;
  verified_email?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

interface StoredAuth {
  user: GoogleUser;
  accessToken: string;
  expiresAt: number;
}

export default function GoogleSignInScreen() {
  const [googleUserInfo, setGoogleUserInfo] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);

  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    androidClientId: "567214050375-70p13dhdknjbebv9uv8cjd7qhjd4bkie.apps.googleusercontent.com",
    iosClientId: "567214050375-4jstuf30dbvr9lfuicf0mk6g3v5smqaa.apps.googleusercontent.com",
    webClientId: '567214050375-6nmenaun0puabssou05m0er5tc7dof77.apps.googleusercontent.com',
    scopes: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/drive.readonly'],
  });

  // 初回ロード時のみ実行
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // 認証レスポンスの処理
  useEffect(() => {
    if (googleResponse?.type === "success") {
      console.log("Google login successful!");
      handleAuthSuccess(googleResponse.authentication);
    } else if (googleResponse?.type === "error") {
      console.error("Google auth error:", googleResponse.error);
    }
  }, [googleResponse]);

  // 保存された認証情報を読み込む
  const loadStoredAuth = async () => {
    try {
      const storedData = await AsyncStorage.getItem("@googleAuth");
      if (storedData) {
        const authData: StoredAuth = JSON.parse(storedData);
        
        // トークンの有効期限チェック
        if (authData.expiresAt > Date.now()) {
          setGoogleUserInfo(authData.user);
          setAccessToken(authData.accessToken);
          console.log("Loaded stored auth for:", authData.user.name);
        } else {
          // 期限切れの場合はクリア
          console.log("Stored token expired, clearing...");
          await clearGoogleStorage();
        }
      }
    } catch (error) {
      console.error("Error loading stored auth:", error);
    }
  };

  // 認証成功時の処理
  const handleAuthSuccess = async (authentication: any) => {
    if (!authentication?.accessToken) return;
    
    setLoading(true);
    try {
      const user = await getGoogleUserInfo(authentication.accessToken);
      
      if (user) {
        // トークンとユーザー情報を保存（有効期限も保存）
        const expiresAt = Date.now() + (authentication.expiresIn || 3600) * 1000;
        const authData: StoredAuth = {
          user,
          accessToken: authentication.accessToken,
          expiresAt,
        };
        
        await AsyncStorage.setItem("@googleAuth", JSON.stringify(authData));
        setGoogleUserInfo(user);
        setAccessToken(authentication.accessToken);
        console.log("Auth saved successfully");
      }
    } catch (error) {
      console.error("Error handling auth success:", error);
    } finally {
      setLoading(false);
    }
  };

  // ユーザー情報取得
  const getGoogleUserInfo = async (token: string): Promise<GoogleUser | null> => {
    if (!token) return null;
    
    console.log("Fetching Google user info...");
    try {
      const response = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const user = await response.json();
      console.log("User info fetched:", user.name);
      return user;
    } catch (error) {
      console.error("Error fetching Google user info:", error);
      return null;
    }
  };

  // Google Driveファイル一覧取得
  const fetchGoogleDriveFiles = async () => {
    if (!accessToken) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        "https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name,mimeType,modifiedTime)",
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const data = await response.json();
      setFiles(data.files || []);
      console.log(`Fetched ${data.files?.length || 0} files`);
    } catch (error) {
      console.error("Error fetching Google Drive files:", error);
    } finally {
      setLoading(false);
    }
  };

  // ストレージクリア
  const clearGoogleStorage = async () => {
    await AsyncStorage.removeItem("@googleAuth");
    setGoogleUserInfo(null);
    setAccessToken(null);
    setFiles([]);
    console.log("Storage cleared");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Google / Drive 認証</Text>
      
      {loading && <ActivityIndicator size="large" color="#4285F4" />}

      {googleResponse && (
        <View style={styles.debugInfo}>
          <Text>Response Type: {googleResponse.type}</Text>
          {googleResponse.type === "error" && (
            <Text style={styles.errorText}>Error: {googleResponse.error?.message}</Text>
          )}
        </View>
      )}

      {googleUserInfo ? (
        <>
          <View style={styles.userInfo}>
            <Text style={styles.sectionTitle}>✅ ユーザー情報:</Text>
            <Text>名前: {googleUserInfo.name}</Text>
            <Text>メール: {googleUserInfo.email}</Text>
            {googleUserInfo.verified_email && (
              <Text style={styles.verifiedText}>✓ メール認証済み</Text>
            )}
            <Text>ID: {googleUserInfo.id}</Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button 
              title="📁 Google Driveファイルを取得" 
              onPress={fetchGoogleDriveFiles}
              disabled={loading}
              color="#4285F4"
            />
          </View>

          {files.length > 0 && (
            <View style={styles.fileList}>
              <Text style={styles.sectionTitle}>Google Drive ファイル ({files.length}件):</Text>
              {files.map((file, index) => (
                <View key={index} style={styles.fileItem}>
                  <Text style={styles.fileName}>
                    {file.mimeType.includes('folder') ? '📁' : '📄'} {file.name}
                  </Text>
                  <Text style={styles.fileDate}>
                    更新: {new Date(file.modifiedTime).toLocaleDateString('ja-JP')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Button 
              color="red"
              title="🚪 ログアウト" 
              onPress={clearGoogleStorage} 
            />
          </View>
        </>
      ) : (
        <View style={styles.buttonContainer}>
          <Button 
            title="🔐 Sign in with Google" 
            onPress={() => googlePromptAsync()}
            disabled={!googleRequest || loading}
            color="#4285F4"
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#4285F4',
  },
  debugInfo: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    width: '100%',
  },
  errorText: {
    color: 'red',
    marginTop: 5,
  },
  userInfo: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#E8F0FE',
    borderRadius: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: '#4285F4',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    fontSize: 16,
  },
  verifiedText: {
    color: '#34A853',
    fontWeight: 'bold',
    marginTop: 5,
  },
  fileList: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    width: '100%',
    maxHeight: 300,
  },
  fileItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  fileDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  buttonContainer: {
    marginVertical: 10,
    width: '100%',
  },
});