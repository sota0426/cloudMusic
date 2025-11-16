import Entypo from "@expo/vector-icons/Entypo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { ActivityIndicator, Button, ScrollView, Text, View } from "react-native";

WebBrowser.maybeCompleteAuthSession();

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

interface GoogleUserInfo {
  name: string;
  email: string;
  verified_email: boolean;
  id: string;
}

export default function GoogleSignInScreen() {
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

  const handleAuthSuccess = async (authentication:any) => {
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

  const getGoogleUserInfo = async (token:string) => {
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

  const fetchGoogleDriveFiles = async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const response = await fetch(
        "https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name,mimeType,modifiedTime)",
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

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
      }}
      className=" px-5 py-10 items-center justify-center"
    >

      {/** Google Login */}
      <Text className="text-2xl font-bold mb-8 text-blue-600">
        <Entypo name="google-drive" size={24}/>
        <Text className="pl-2">Google / Drive 認証</Text>
      </Text>

      {loading && <ActivityIndicator size="large" color="#4285F4" />}

      {googleResponse && (
        <View className="my-3 p-3 bg-gray-200 rounded w-full">
          <Text>Response Type: {googleResponse.type}</Text>
          {googleResponse.type === "error" && (
            <Text className="text-red-500 mt-1">
              Error: {googleResponse.error?.message}
            </Text>
          )}
        </View>
      )}

      {googleUserInfo ? (
        <>
          <View className="my-5 p-4 bg-blue-100 rounded w-full border border-blue-500">
            <Text className="font-bold mb-2 text-lg">ユーザー情報</Text>
            <Text>名前: {googleUserInfo.name}</Text>
            <Text>メール: {googleUserInfo.email}</Text>
            {googleUserInfo.verified_email && (
              <Text className="text-green-600 font-bold mt-1">
                ✓ メール認証済み
              </Text>
            )}
            <Text>ID: {googleUserInfo.id}</Text>
          </View>

          <View className="w-full my-3">
            <Button
              title="Google Driveファイルを取得"
              onPress={fetchGoogleDriveFiles}
              color="#4285F4"
            />
          </View>

          {files.length > 0 && (
            <View className="my-5 p-4 bg-gray-100 rounded w-full max-h-80">
              <Text className="font-bold mb-3 text-lg">
                Google Drive ファイル ({files.length}件)
              </Text>

              {files.map((file, index) => (
                <View
                  key={index}
                  className="py-2 border-b border-gray-300"
                >
                  <Text className="font-medium">
                    {file.mimeType.includes("folder") ? "📁" : "📄"} {file.name}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    更新:{" "}
                    {new Date(file.modifiedTime).toLocaleDateString("ja-JP")}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View className="w-full my-3">
            <Button
              title="ログアウト"
              onPress={clearGoogleStorage}
              color="red"
            />
          </View>
        </>
      ) : (
        <View className="w-full my-3">
          <Button
            title="Sign in with Google"
            onPress={() => googlePromptAsync()}
            disabled={!googleRequest || loading}
            color="#4285F4"
          />
        </View>
      )}
    </ScrollView>
  );
}
