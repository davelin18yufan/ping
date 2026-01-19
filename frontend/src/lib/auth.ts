import { betterAuth } from "better-auth"
import { tanstackStartCookies } from "better-auth/tanstack-start"

export const auth = betterAuth({
    //* make sure this is the last plugin in the array
    plugins: [tanstackStartCookies()],
})
