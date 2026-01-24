/**
 * Login Screen
 * OAuth authentication with Google, GitHub, and Magic Link fallback
 */

import { useState } from "react"
import {
    View,
    Text,
    TouchableOpacity,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native"
import { useRouter } from "expo-router"
import { useSignIn, useAuth } from "@/hooks/useAuth"

export default function LoginScreen() {
    const router = useRouter()
    const { isAuthenticated } = useAuth()
    const { signInWithOAuth, signInWithMagicLink, isPending, error } =
        useSignIn()
    const [email, setEmail] = useState("")
    const [showMagicLink, setShowMagicLink] = useState(false)

    // Redirect to home if already authenticated
    if (isAuthenticated) {
        router.replace("/(tabs)")
        return null
    }

    const handleGoogleLogin = async () => {
        try {
            await signInWithOAuth("google")
            // Navigation will be handled by callback screen
        } catch (err) {
            Alert.alert(
                "Sign In Failed",
                err instanceof Error
                    ? err.message
                    : "Failed to sign in with Google"
            )
        }
    }

    const handleGitHubLogin = async () => {
        try {
            await signInWithOAuth("github")
            // Navigation will be handled by callback screen
        } catch (err) {
            Alert.alert(
                "Sign In Failed",
                err instanceof Error
                    ? err.message
                    : "Failed to sign in with GitHub"
            )
        }
    }

    const handleMagicLinkLogin = async () => {
        if (!email || !email.includes("@")) {
            Alert.alert("Invalid Email", "Please enter a valid email address")
            return
        }

        try {
            await signInWithMagicLink(email)
            Alert.alert(
                "Email Sent",
                `Check your email (${email}) for a magic link to sign in.`
            )
        } catch (err) {
            Alert.alert(
                "Sign In Failed",
                err instanceof Error ? err.message : "Failed to send magic link"
            )
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
        >
            <ScrollView
                contentContainerClassName="flex-1 items-center justify-center bg-gray-50 p-6"
                keyboardShouldPersistTaps="handled"
            >
                <View className="w-full max-w-md">
                    <Text className="mb-12 text-center text-4xl font-bold text-gray-900">
                        Ping
                    </Text>
                    <Text className="mb-8 text-center text-lg text-gray-600">
                        Sign in to start chatting
                    </Text>

                    {error && (
                        <View className="mb-4 rounded-lg bg-red-100 p-4">
                            <Text className="text-center text-red-700">
                                {typeof error === "string"
                                    ? error
                                    : "Authentication error"}
                            </Text>
                        </View>
                    )}

                    {/* OAuth Buttons */}
                    <View className="mb-6 w-full space-y-3">
                        <TouchableOpacity
                            onPress={handleGoogleLogin}
                            disabled={isPending}
                            className={`w-full flex-row items-center justify-center rounded-lg border border-gray-300 bg-white py-4 ${isPending ? "opacity-50" : ""}`}
                            testID="google-login-button"
                        >
                            <Text className="text-base font-medium text-gray-700">
                                {isPending
                                    ? "Signing in..."
                                    : "Sign in with Google"}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleGitHubLogin}
                            disabled={isPending}
                            className={`w-full flex-row items-center justify-center rounded-lg border border-gray-300 bg-gray-800 py-4 ${isPending ? "opacity-50" : ""}`}
                            testID="github-login-button"
                        >
                            <Text className="text-base font-medium text-white">
                                {isPending
                                    ? "Signing in..."
                                    : "Sign in with GitHub"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Magic Link Fallback */}
                    {showMagicLink ? (
                        <View className="w-full">
                            <TextInput
                                placeholder="Enter your email"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                className="mb-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base"
                                testID="email-input"
                            />
                            <TouchableOpacity
                                onPress={handleMagicLinkLogin}
                                disabled={isPending || !email}
                                className={`w-full rounded-lg bg-blue-500 py-4 ${isPending || !email ? "opacity-50" : ""}`}
                                testID="magic-link-button"
                            >
                                <Text className="text-center text-base font-medium text-white">
                                    {isPending
                                        ? "Sending..."
                                        : "Send Magic Link"}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setShowMagicLink(false)}
                                className="mt-3"
                            >
                                <Text className="text-center text-sm text-gray-500">
                                    Back to OAuth
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={() => setShowMagicLink(true)}
                            className="mt-4"
                        >
                            <Text className="text-center text-sm text-gray-500">
                                Or sign in with email
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}
