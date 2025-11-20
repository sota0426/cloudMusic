import { useGoogleDrive } from "@/provider/useGoogleDrive";
import Entypo from "@expo/vector-icons/Entypo";
import { useEffect } from "react";
import {
    ActivityIndicator,
    Button,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";

export default function GoogleDriveFilesScreen() {
  const {
    googleUserInfo,
    loading,
    files,
    fetchGoogleDriveFiles,
    signOut,
    isAuthenticated,
  } = useGoogleDrive();

  useEffect(() => {
    if (isAuthenticated) {
      fetchGoogleDriveFiles();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center px-5">
        <Text className="text-lg mb-4">ログインが必要です</Text>
      </View>
    );
  }

  const folders = files.filter((file) =>
    file.mimeType.includes("folder")
  );
  const audioFiles = files.filter((file) =>
    file.mimeType.includes("audio/")
  );

  return (
    <ScrollView
      className="flex-1 px-5 py-10"
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={fetchGoogleDriveFiles}
        />
      }
    >
      <View className="items-center mb-6">
        <Text className="text-2xl font-bold text-blue-600">
          <Entypo name="google-drive" size={24} />
          <Text className="pl-2">Google Drive</Text>
        </Text>

        {googleUserInfo && (
          <Text className="text-gray-600 mt-2">{googleUserInfo.email}</Text>
        )}
      </View>

      {loading && !files.length ? (
        <ActivityIndicator size="large" color="#4285F4" />
      ) : (
        <>
          {/* フォルダ一覧 */}
          {folders.length > 0 && (
            <View className="mb-6">
              <Text className="text-xl font-bold mb-3">
                📁 フォルダ ({folders.length}件)
              </Text>
              {folders.map((folder) => (
                <View
                  key={folder.id}
                  className="p-4 mb-2 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <Text className="font-medium text-lg">📁 {folder.name}</Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    更新:{" "}
                    {new Date(folder.modifiedTime).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 音楽ファイル一覧 */}
          {audioFiles.length > 0 && (
            <View className="mb-6">
              <Text className="text-xl font-bold mb-3">
                🎵 音楽ファイル ({audioFiles.length}件)
              </Text>
              {audioFiles.map((file) => (
                <View
                  key={file.id}
                  className="p-4 mb-2 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <Text className="font-medium text-lg">🎵 {file.name}</Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    タイプ: {file.mimeType.split("/")[1]?.toUpperCase()}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    更新:{" "}
                    {new Date(file.modifiedTime).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {files.length === 0 && !loading && (
            <View className="items-center py-10">
              <Text className="text-gray-500 text-lg">
                フォルダまたは音楽ファイルが見つかりませんでした
              </Text>
            </View>
          )}
        </>
      )}

      <View className="my-6 space-y-3">
        <Button
          title="再読み込み"
          onPress={fetchGoogleDriveFiles}
          color="#4285F4"
        />
        <View className="mt-3">
          <Button title="ログアウト" onPress={signOut} color="red" />
        </View>
      </View>
    </ScrollView>
  );
}