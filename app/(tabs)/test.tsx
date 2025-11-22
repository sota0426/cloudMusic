import GoogleSignInScreen from "@/components/login/GoogleSignInScreen";
import { useGoogleDrive } from "@/provider/useGoogleDrive";
import { router } from "expo-router";
import { View } from "react-native";

export default function test(){

    const {isAuthenticated}=useGoogleDrive();

    return (
        <View className="flex-1 bg-slate-500 items-center justify-center">
            <GoogleSignInScreen 
                onAuthSuccess={()=>{router.push("/GoogleDriveFilesScreen")}}
            />
        </View>
    )
};