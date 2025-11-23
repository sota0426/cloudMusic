import { View } from "react-native";
// import GoogleSignInScreen from "../../components/login/SignIn_Google";
import GoogleSignInScreen from "@/components/login/GoogleSignInScreen";
import MicrosoftSignInScreen from "@/components/login/MicrosoftSignInScreen";

export default function SignInScreen() {
  return(
    <View className="flex-1  bg-white items-center justify-center">
        <GoogleSignInScreen 
          onAuthSuccess={()=>{}}
        />
        <MicrosoftSignInScreen
          onAuthSuccess={()=>{}}
        />
    </View>
  )
}
