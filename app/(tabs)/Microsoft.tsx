import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

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

export default function MicrosoftSignInScreen() {
  const [microsoftUserInfo, setMicrosoftUserInfo] = useState<MicrosoftUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  
  const clientId = "0f7f6cf5-7f64-4ed5-bbff-3f0cb8796763";
  const tenantId = "9c88b83f-6b00-42a9-a985-8091fbea96f3";

  const discovery = {
    authorizationEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
  };

  const redirectUri = AuthSession.makeRedirectUri();
  
  console.log("Redirect URI:", redirectUri);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId,
      redirectUri: redirectUri,
      scopes: ['openid', 'profile', 'User.Read', 'Files.Read', 'Files.Read.All', 'offline_access'],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  // 初回ロード時のみ実行
  useEffect(() => {
    loadStoredAuth();
  }, []);

  // 認証レスポンスの処理
  useEffect(() => {
    if (response?.type === "success") {
      console.log("Login successful!");
      console.log("Full response:", response);
      
      const { code } = response.params;
      
      if (code && request) {
        console.log("Authorization code received");
        console.log("Code verifier exists:", !!request.codeVerifier);
        exchangeCodeForToken(code, request.codeVerifier);
      } else {
        console.error("No authorization code or request object");
      }
    } else if (response?.type === "error") {
      console.error("Auth error:", response.error);
    }
  }, [response, request]);

  // Authorization Code を Access Token に交換
  const exchangeCodeForToken = async (code: string, codeVerifier?: string) => {
    if (!codeVerifier) {
      console.error("Code verifier is missing!");
      return;
    }

    setLoading(true);
    try {
      console.log("Exchanging code for token...");
      console.log("Code verifier length:", codeVerifier.length);
      
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: clientId,
          code: code,
          redirectUri: redirectUri,
          extraParams: {
            code_verifier: codeVerifier,
          },
        },
        discovery
      );

      console.log("Token exchange successful");
      console.log("Access token received:", tokenResponse.accessToken.substring(0, 20) + "...");
      
      await handleAuthSuccess(tokenResponse.accessToken, tokenResponse.expiresIn);
    } catch (error) {
      console.error("Error exchanging code for token:", error);
      
      // エラーの詳細を表示
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // 保存された認証情報を読み込む
  const loadStoredAuth = async () => {
    try {
      const storedData = await AsyncStorage.getItem("@microsoftAuth");
      if (storedData) {
        const authData: StoredAuth = JSON.parse(storedData);
        
        // トークンの有効期限チェック
        if (authData.expiresAt > Date.now()) {
          setMicrosoftUserInfo(authData.user);
          setAccessToken(authData.accessToken);
          console.log("Loaded stored auth for:", authData.user.displayName);
        } else {
          // 期限切れの場合はクリア
          console.log("Stored token expired, clearing...");
          await clearMicrosoftStorage();
        }
      }
    } catch (error) {
      console.error("Error loading stored auth:", error);
    }
  };

  // 認証成功時の処理
  const handleAuthSuccess = async (token: string, expiresIn?: number) => {
    if (!token) return;
    
    setLoading(true);
    try {
      const user = await getMicrosoftUserInfo(token);
      
      if (user) {
        // トークンとユーザー情報を保存（有効期限も保存）
        const expiresInSeconds = expiresIn || 3600;
        const expiresAt = Date.now() + expiresInSeconds * 1000;
        
        const authData: StoredAuth = {
          user,
          accessToken: token,
          expiresAt,
        };
        
        await AsyncStorage.setItem("@microsoftAuth", JSON.stringify(authData));
        setMicrosoftUserInfo(user);
        setAccessToken(token);
        console.log("Auth saved successfully");
      }
    } catch (error) {
      console.error("Error handling auth success:", error);
    } finally {
      setLoading(false);
    }
  };

  // ユーザー情報取得
  const getMicrosoftUserInfo = async (token: string): Promise<MicrosoftUser | null> => {
    console.log("Fetching Microsoft user info...");
    try {
      const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const user = await response.json();
      console.log("User info fetched:", user.displayName);
      return user;
    } catch (error) {
      console.error("Error fetching Microsoft user info:", error);
      return null;
    }
  };

  // OneDriveファイル一覧取得
  const fetchOneDriveFiles = async () => {
    if (!accessToken) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        "https://graph.microsoft.com/v1.0/me/drive/root/children",
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const data = await response.json();
      setFiles(data.value || []);
      console.log(`Fetched ${data.value?.length || 0} files`);
    } catch (error) {
      console.error("Error fetching OneDrive files:", error);
    } finally {
      setLoading(false);
    }
  };

  // ストレージクリア
  const clearMicrosoftStorage = async () => {
    await AsyncStorage.removeItem("@microsoftAuth");
    setMicrosoftUserInfo(null);
    setAccessToken(null);
    setFiles([]);
    console.log("Storage cleared");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Microsoft / OneDrive 認証</Text>
      
      {loading && <ActivityIndicator size="large" color="#0078d4" />}

      {response && (
        <View style={styles.debugInfo}>
          <Text>Response Type: {response.type}</Text>
          {response.type === "error" && (
            <Text style={styles.errorText}>Error: {response.error?.message}</Text>
          )}
        </View>
      )}

      {microsoftUserInfo ? (
        <>
          <View style={styles.userInfo}>
            <Text style={styles.sectionTitle}>✅ ユーザー情報:</Text>
            <Text>名前: {microsoftUserInfo.displayName}</Text>
            <Text>メール: {microsoftUserInfo.mail || microsoftUserInfo.userPrincipalName}</Text>
            <Text>ID: {microsoftUserInfo.id}</Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button 
              title="📁 OneDriveファイルを取得" 
              onPress={fetchOneDriveFiles}
              disabled={loading}
            />
          </View>

          {files.length > 0 && (
            <View style={styles.fileList}>
              <Text style={styles.sectionTitle}>OneDrive ファイル ({files.length}件):</Text>
              {files.slice(0, 10).map((file, index) => (
                <Text key={index} style={styles.fileItem}>
                  {file.folder ? '📁' : '📄'} {file.name}
                </Text>
              ))}
              {files.length > 10 && (
                <Text style={styles.moreText}>... 他 {files.length - 10} 件</Text>
              )}
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Button 
              color="red"
              title="🚪 ログアウト" 
              onPress={clearMicrosoftStorage} 
            />
          </View>
        </>
      ) : (
        <View style={styles.buttonContainer}>
          <Button 
            title="🔐 Sign in with Microsoft" 
            onPress={() => promptAsync()}
            disabled={!request || loading}
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
    color: '#0078d4',
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
    backgroundColor: '#e7f3ff',
    borderRadius: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: '#0078d4',
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    fontSize: 16,
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
    paddingVertical: 5,
    fontSize: 14,
  },
  moreText: {
    paddingTop: 10,
    fontStyle: 'italic',
    color: '#666',
  },
  buttonContainer: {
    marginVertical: 10,
    width: '100%',
  },
});