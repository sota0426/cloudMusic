import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, View } from 'react-native';


const clientId = "fde2e323-ea39-42aa-a0b7-47bed2084bb2";
const tenantId ="9c88b83f-6b00-42a9-a985-8091fbea96f3";


WebBrowser.maybeCompleteAuthSession();

const MS_CLIENT_ID = "fde2e323-ea39-42aa-a0b7-47bed2084bb2";
const MS_REDIRECT_URI = "http://localhost:8081/Microsoft";

const msDiscovery = {
  authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
};

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
  
  const [microsoftRequest, microsoftResponse, microsoftPromptAsync] = AuthSession.useAuthRequest({
    clientId: MS_CLIENT_ID,
    redirectUri: MS_REDIRECT_URI,
    scopes: ['openid', 'profile', 'User.Read', 'Files.Read', 'Files.Read.All'],
    responseType: AuthSession.ResponseType.Token,
  }, msDiscovery);

  // 初回ロード時のみ実行
  useEffect(() => {
    console.log("Loading stored auth...");
    loadStoredAuth();
  }, []);

  // 認証レスポンスの処理
  useEffect(() => {
    if (microsoftResponse?.type === "success") {
      handleAuthSuccess(microsoftResponse.authentication);
    } 
  }, [microsoftResponse]);

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
        } else {
          // 期限切れの場合はクリア
          await clearMicrosoftStorage();
        }
      }
    } catch (error) {
      console.error("Error loading stored auth:", error);
    }
  };

  // 認証成功時の処理
  const handleAuthSuccess = async (authentication: any) => {
    
    if (!authentication?.accessToken) {
      console.log("hai")
      return};
    
    setLoading(true);
    try {
      const user = await getMicrosoftUserInfo(authentication.accessToken);
      
      if (user) {
        // トークンとユーザー情報を保存（有効期限も保存）
        const expiresAt = Date.now() + (authentication.expiresIn || 3600) * 1000;
        const authData: StoredAuth = {
          user,
          accessToken: authentication.accessToken,
          expiresAt,
        };
        
        await AsyncStorage.setItem("@microsoftAuth", JSON.stringify(authData));
        setMicrosoftUserInfo(user);
        setAccessToken(authentication.accessToken);
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const user = await response.json();
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setFiles(data.value || []);
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
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Microsoft / OneDrive 認証</Text>
        
        {loading && <ActivityIndicator size="large" color="#0078d4" />}
        {microsoftResponse &&(
          <View>
            <Text>Response Type: {microsoftResponse.type}</Text>
          </View>
        )}
        {microsoftUserInfo ? (
          <>
            <View style={styles.userInfo}>
              <Text style={styles.label}>ユーザー情報:</Text>
              <Text>名前: {microsoftUserInfo.displayName}</Text>
              <Text>メール: {microsoftUserInfo.mail || microsoftUserInfo.userPrincipalName}</Text>
              <Text>ID: {microsoftUserInfo.id}</Text>
            </View>

            <Button 
              title="OneDriveファイルを取得" 
              onPress={fetchOneDriveFiles}
              disabled={loading}
            />

            {files.length > 0 && (
              <View style={styles.filesList}>
                <Text style={styles.label}>OneDrive ファイル:</Text>
                {files.map((file, index) => (
                  <Text key={index} style={styles.fileItem}>
                    📄 {file.name}
                  </Text>
                ))}
              </View>
            )}

            <Button 
              color="red"
              title="ログアウト" 
              onPress={clearMicrosoftStorage} 
            />
          </>
        ) : (
          <Button 
            title="Sign in with Microsoft" 
            onPress={() => microsoftPromptAsync()}
            disabled={!microsoftRequest || loading}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  userInfo: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  filesList: {
    marginTop: 15,
    width: '100%',
  },
  fileItem: {
    paddingVertical: 5,
    paddingLeft: 10,
  },
});