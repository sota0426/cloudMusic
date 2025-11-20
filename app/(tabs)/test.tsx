import GoogleDriveFilesScreen from "@/components/files/GoogleDriveFilesScreen";
import { useGoogleDrive } from "@/provider/useGoogleDrive";
import { View } from "react-native";

export default function test(){

    const {isAuthenticated}=useGoogleDrive();

    return (
        <View className="flex-1 bg-slate-500 items-center justify-center">
            <GoogleDriveFilesScreen />
        </View>
    )
};