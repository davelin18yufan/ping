/**
 * Expo app configuration
 * Supports dynamic configuration based on environment variables
 *
 * @see https://docs.expo.dev/workflow/configuration/
 */

import type { ExpoConfig } from "expo/config"

const config: ExpoConfig = {
    name: "ping",
    slug: "ping",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: process.env.EXPO_PUBLIC_APP_SCHEME || "ping",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
        supportsTablet: true,
        bundleIdentifier: "com.ping.app",
        associatedDomains: ["applinks:ping.app", "applinks:*.ping.app"],
    },
    android: {
        adaptiveIcon: {
            backgroundColor: "#E6F4FE",
            foregroundImage: "./assets/images/android-icon-foreground.png",
            backgroundImage: "./assets/images/android-icon-background.png",
            monochromeImage: "./assets/images/android-icon-monochrome.png",
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
        package: "com.ping.app",
        intentFilters: [
            {
                action: "VIEW",
                autoVerify: true,
                data: [
                    {
                        scheme: "https",
                        host: "*.ping.app",
                        pathPrefix: "/auth/callback",
                    },
                    {
                        scheme: process.env.EXPO_PUBLIC_APP_SCHEME || "ping",
                        host: "auth",
                        pathPrefix: "/callback",
                    },
                ],
                category: ["BROWSABLE", "DEFAULT"],
            },
        ],
    },
    web: {
        output: "static",
        favicon: "./assets/images/favicon.png",
    },
    plugins: [
        "expo-router",
        [
            "expo-splash-screen",
            {
                image: "./assets/images/splash-icon.png",
                imageWidth: 200,
                resizeMode: "contain",
                backgroundColor: "#ffffff",
                dark: {
                    backgroundColor: "#000000",
                },
            },
        ],
    ],
    experiments: {
        typedRoutes: true,
        reactCompiler: true,
    },
}

export default config
