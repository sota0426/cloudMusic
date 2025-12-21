import { useGoogleDrive } from "@/provider/useGoogleDrive";
import Entypo from "@expo/vector-icons/Entypo";
import { useEffect } from "react";
import { ActivityIndicator, Button, Text, View } from "react-native";

interface GoogleSignInScreenProps {
  onAuthSuccess: () => void;
}

export default function GoogleSignInScreen({ onAuthSuccess }: GoogleSignInScreenProps) {
  const {
    googleUserInfo,
    loading,
    googleRequest,
    googleResponse,
    signIn,
    signOut,
    isAuthenticated,
  } = useGoogleDrive();

  useEffect(() => {
    if (isAuthenticated) {
      onAuthSuccess();
    }
  }, [isAuthenticated]);

  return (
    <View className="flex-1 px-5 items-center justify-center">
      <Text className="text-2xl font-bold mb-8 text-blue-600">
        <Entypo name="google-drive" size={24} />
        <Text className="pl-2">Google / Drive 認証</Text>
      </Text>

      {loading && <ActivityIndicator size="large" color="#4285F4" />}

      {googleResponse && googleResponse.type === "error" && (
        <View className="my-3 p-3 bg-gray-200 rounded w-full">
          <Text>Response Type: {googleResponse.type}</Text>
          <Text className="text-red-500 mt-1">
            Error: {googleResponse.error?.message}
          </Text>
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
          </View>

          <View className="w-full my-3">
            <Button title="ログアウト" onPress={signOut} color="red" />
          </View>
        </>
      ) : (
        <View className="w-full my-3">
          <Button
            title="Sign in with Google"
            onPress={signIn}
            disabled={!googleRequest || loading}
            color="#4285F4"
          />
        </View>
      )}
    </View>
  );
}