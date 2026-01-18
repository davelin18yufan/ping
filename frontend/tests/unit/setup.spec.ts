import { describe, test, expect } from "vitest"

describe("Vitest Setup Verification", () => {
    test("should have vitest globals available", () => {
        expect(describe).toBeDefined()
        expect(test).toBeDefined()
        expect(expect).toBeDefined()
    })

    test("should have jsdom environment", () => {
        expect(typeof window).toBe("object")
        expect(typeof document).toBe("object")
    })
})
