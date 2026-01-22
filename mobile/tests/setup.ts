// @testing-library/react-native v12.4+ has built-in matchers
// No need to import extend-expect

// Extend global types for testing
declare global {
    var __ExpoImportMetaRegistry: {
        register: jest.Mock
        get: jest.Mock
    }
    var structuredClone: <T>(obj: T) => T
}

// Mock Expo winter runtime (Expo 54+)
globalThis.__ExpoImportMetaRegistry = {
    register: jest.fn(),
    get: jest.fn(),
}

// Polyfill structuredClone if not available
if (typeof globalThis.structuredClone === "undefined") {
    globalThis.structuredClone = <T>(obj: T): T =>
        JSON.parse(JSON.stringify(obj))
}

// Mock expo modules
jest.mock("expo-router", () => ({
    useRouter: jest.fn(),
    useLocalSearchParams: jest.fn(),
    Link: "Link",
}))

jest.mock("expo-linking", () => ({
    createURL: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
}))

jest.mock("expo-secure-store", () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}))

// Mock NativeWind
jest.mock("nativewind", () => ({
    useColorScheme: jest.fn(() => ({ colorScheme: "light" })),
}))

// Setup global test timeout
jest.setTimeout(10000)
