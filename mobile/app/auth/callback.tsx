/**
 * OAuth Callback Handler Screen
 * Handles OAuth redirect from deep link: ping://auth/callback?code=...
 */

import { useEffect, useState } from "react"
import { View, Text, ActivityIndicator } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { reconnectSocket } from "@/lib/socket"

export default function AuthCallbackScreen() {
    const router = useRouter()
    const params = useLocalSearchParams()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                // Extract OAuth parameters from URL
                const { code, error: oauthError, errorDescription } = params

                // Handle OAuth error
                if (oauthError) {
                    const errorMsg = errorDescription
                        ? decodeURIComponent(errorDescription as string)
                        : (oauthError as string)
                    setError(errorMsg)

                    // Navigate back to login after showing error
                    setTimeout(() => {
                        router.replace("/auth/login")
                    }, 3000)
                    return
                }

                // Handle OAuth success
                if (code) {
                    // OAuth code will be automatically handled by Better Auth
                    // Session will be stored in SecureStore

                    // Wait a moment for session to be stored
                    await new Promise<void>((resolve) =>
                        setTimeout(resolve, 500)
                    )

                    // Update Apollo Client and Socket.io
                    // Token should already be in SecureStore
                    await reconnectSocket()

                    // Navigate to home screen
                    router.replace("/(tabs)")
                } else {
                    throw new Error(
                        "Invalid OAuth callback: missing code or error"
                    )
                }
            } catch (err) {
                console.error("OAuth callback handling error:", err)
                const errorMsg =
                    err instanceof Error
                        ? err.message
                        : "Failed to complete OAuth flow"
                setError(errorMsg)

                // Navigate back to login after showing error
                setTimeout(() => {
                    router.replace("/auth/login")
                }, 3000)
            }
        }

        handleOAuthCallback()
    }, [params, router])

    if (error) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-50 p-6">
                <View className="w-full max-w-md items-center rounded-lg bg-red-100 p-6">
                    <Text className="text-center text-lg font-semibold text-red-800">
                        Authentication Failed
                    </Text>
                    <Text className="mt-4 text-center text-base text-red-700">
                        {error}
                    </Text>
                    <Text className="mt-4 text-sm text-red-600">
                        Redirecting to login...
                    </Text>
                </View>
            </View>
        )
    }

    return (
        <View className="flex-1 items-center justify-center bg-gray-50">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="mt-4 text-base text-gray-600">
                Completing sign in...
            </Text>
        </View>
    )
}
