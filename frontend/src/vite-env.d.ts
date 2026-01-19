interface ViteTypeOptions {
    // By adding this line, you can make the type of ImportMetaEnv strict
    // to disallow unknown keys.
    strictImportMetaEnv: unknown
}

// more env variables...
interface ImportMetaEnv {
    readonly VITE_GRAPHQL_ENDPOINT: string
    readonly VITE_API_URL: string
    readonly VITE_SENTRY_DSN: string
    readonly VITE_SENTRY_ORG: string
    readonly VITE_SENTRY_PROJECT: string
    readonly VITE_SOCKET_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
