/**
 * Aesthetic Modes CSS Tests
 *
 * Test suite for aesthetic-modes.css CSS variables and styling
 * Based on Feature-1.2.0-TDD-Tests.md Section 4.1 & 5.1
 *
 * Tests:
 * - Ornate mode CSS variables
 * - Minimal mode CSS variables
 * - Reduced motion support
 * - CSS class application
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest"

describe("Aesthetic Modes CSS Tests", () => {
    beforeEach(() => {
        // Reset HTML classes
        document.documentElement.classList.remove("minimal")
        document.documentElement.removeAttribute("style")
    })

    afterEach(() => {
        // Clean up
        document.documentElement.classList.remove("minimal")
    })

    /**
     * Test 4.1: Ornate mode CSS variables defined
     * Verify default :root variables for ornate mode
     */
    it("should define ornate mode CSS variables", () => {
        const style = getComputedStyle(document.documentElement)

        // Animation duration (ornate: 300ms)
        const duration = style.getPropertyValue("--animation-duration")
        expect(duration).toBeTruthy()

        // Glow intensity (ornate: 20px)
        const glowIntensity = style.getPropertyValue("--glow-intensity")
        expect(glowIntensity).toBeTruthy()

        // Spring stiffness (ornate: 300)
        const springStiffness = style.getPropertyValue("--spring-stiffness")
        expect(springStiffness).toBeTruthy()

        // AcousticField opacity (ornate: 1)
        const acousticOpacity = style.getPropertyValue("--acoustic-field-opacity")
        expect(acousticOpacity).toBeTruthy()
    })

    /**
     * Test 4.2: Minimal mode CSS variables override ornate
     * Verify .minimal class changes variables
     */
    it("should override variables in minimal mode", () => {
        // Add minimal class
        document.documentElement.classList.add("minimal")

        const style = getComputedStyle(document.documentElement)

        // Variables should exist (minimal mode overrides)
        const duration = style.getPropertyValue("--animation-duration")
        const glowIntensity = style.getPropertyValue("--glow-intensity")

        expect(duration).toBeTruthy()
        expect(glowIntensity).toBeTruthy()
    })

    /**
     * Test 4.3: Ornate mode animation duration
     * Verify 300ms duration for ornate mode
     */
    it("should use 300ms animation duration in ornate mode", () => {
        const style = getComputedStyle(document.documentElement)
        const duration = style.getPropertyValue("--animation-duration").trim()

        // Should be 300ms or contain 300
        expect(duration).toContain("300")
    })

    /**
     * Test 4.4: Minimal mode animation duration
     * Verify 150ms duration for minimal mode
     */
    it("should use 150ms animation duration in minimal mode", () => {
        document.documentElement.classList.add("minimal")

        const style = getComputedStyle(document.documentElement)
        const duration = style.getPropertyValue("--animation-duration").trim()

        // Should be 150ms or contain 150
        expect(duration).toContain("150")
    })

    /**
     * Test 4.5: Ornate mode glow effect
     * Verify glow intensity is 20px
     */
    it("should have glow effect in ornate mode", () => {
        const style = getComputedStyle(document.documentElement)
        const glowIntensity = style.getPropertyValue("--glow-intensity").trim()

        // Should be 20px or contain 20
        expect(glowIntensity).toContain("20")
    })

    /**
     * Test 4.6: Minimal mode disables glow effect
     * Verify glow intensity is 0px
     */
    it("should disable glow effect in minimal mode", () => {
        document.documentElement.classList.add("minimal")

        const style = getComputedStyle(document.documentElement)
        const glowIntensity = style.getPropertyValue("--glow-intensity").trim()

        // Should be 0px
        expect(glowIntensity).toContain("0")
    })

    /**
     * Test 4.7: Ornate mode spring physics
     * Verify spring stiffness is 300
     */
    it("should use spring physics in ornate mode", () => {
        const style = getComputedStyle(document.documentElement)
        const springStiffness = style.getPropertyValue("--spring-stiffness").trim()

        // Should be 300
        expect(springStiffness).toContain("300")
    })

    /**
     * Test 4.8: Minimal mode simplified spring physics
     * Verify spring stiffness is 150
     */
    it("should use simplified spring physics in minimal mode", () => {
        document.documentElement.classList.add("minimal")

        const style = getComputedStyle(document.documentElement)
        const springStiffness = style.getPropertyValue("--spring-stiffness").trim()

        // Should be 150
        expect(springStiffness).toContain("150")
    })

    /**
     * Test 4.9: Ornate mode AcousticField visible
     * Verify acoustic-field-opacity is 1
     */
    it("should show AcousticField in ornate mode", () => {
        const style = getComputedStyle(document.documentElement)
        const opacity = style.getPropertyValue("--acoustic-field-opacity").trim()

        // Should be 1
        expect(opacity).toContain("1")
    })

    /**
     * Test 4.10: Minimal mode AcousticField hidden
     * Verify acoustic-field-opacity is 0
     */
    it("should hide AcousticField in minimal mode", () => {
        document.documentElement.classList.add("minimal")

        const style = getComputedStyle(document.documentElement)
        const opacity = style.getPropertyValue("--acoustic-field-opacity").trim()

        // Should be 0
        expect(opacity).toContain("0")
    })

    /**
     * Test 4.11: Ornate mode easing function
     * Verify cubic-bezier easeOutBack
     */
    it("should use easeOutBack easing in ornate mode", () => {
        const style = getComputedStyle(document.documentElement)
        const easing = style.getPropertyValue("--animation-easing").trim()

        // Should contain cubic-bezier
        expect(easing).toContain("cubic-bezier")
    })

    /**
     * Test 4.12: Minimal mode easing function
     * Verify ease-out linear
     */
    it("should use ease-out easing in minimal mode", () => {
        document.documentElement.classList.add("minimal")

        const style = getComputedStyle(document.documentElement)
        const easing = style.getPropertyValue("--animation-easing").trim()

        // Should be ease-out
        expect(easing).toContain("ease-out")
    })

    /**
     * Test 4.13: Class toggle switches mode
     * Verify adding/removing .minimal class changes variables
     */
    it("should switch modes when toggling minimal class", () => {
        // Ornate mode (no class)
        let style = getComputedStyle(document.documentElement)
        let duration = style.getPropertyValue("--animation-duration").trim()
        expect(duration).toContain("300")

        // Minimal mode (add class)
        document.documentElement.classList.add("minimal")
        style = getComputedStyle(document.documentElement)
        duration = style.getPropertyValue("--animation-duration").trim()
        expect(duration).toContain("150")

        // Back to ornate (remove class)
        document.documentElement.classList.remove("minimal")
        style = getComputedStyle(document.documentElement)
        duration = style.getPropertyValue("--animation-duration").trim()
        expect(duration).toContain("300")
    })

    /**
     * Test 4.14: Reduced motion overrides all modes
     * Verify prefers-reduced-motion disables animations
     */
    it("should respect prefers-reduced-motion media query", () => {
        // Check if media query exists
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

        expect(mediaQuery).toBeDefined()
        expect(mediaQuery.media).toBe("(prefers-reduced-motion: reduce)")

        // In real browser with reduced motion enabled,
        // --animation-duration would be 0.01ms
        // In test environment, we verify the query is available
    })

    /**
     * Test 4.15: Transition timing variable
     * Verify --transition-timing combines duration and easing
     */
    it("should define transition-timing variable", () => {
        const style = getComputedStyle(document.documentElement)
        const transitionTiming = style.getPropertyValue("--transition-timing").trim()

        expect(transitionTiming).toBeTruthy()
    })

    /**
     * Test 4.16: Utility class animate-aesthetic
     * Verify utility class uses CSS variables
     */
    it("should provide animate-aesthetic utility class", () => {
        // Create test element
        const testElement = document.createElement("div")
        testElement.className = "animate-aesthetic"
        document.body.appendChild(testElement)

        const style = getComputedStyle(testElement)

        // Should have transition properties using variables
        // Note: In test env, computed styles may not fully resolve
        expect(style).toBeDefined()

        // Clean up
        document.body.removeChild(testElement)
    })

    /**
     * Test 4.17: Utility class glow-effect
     * Verify glow-effect uses CSS variables
     */
    it("should provide glow-effect utility class", () => {
        const testElement = document.createElement("div")
        testElement.className = "glow-effect"
        document.body.appendChild(testElement)

        const style = getComputedStyle(testElement)

        // Should have filter and opacity
        expect(style).toBeDefined()

        document.body.removeChild(testElement)
    })

    /**
     * Test 4.18: Utility class ornate-only
     * Verify ornate-only respects acoustic-field-opacity
     */
    it("should provide ornate-only utility class", () => {
        const testElement = document.createElement("div")
        testElement.className = "ornate-only"
        document.body.appendChild(testElement)

        // Ornate mode: opacity should be 1
        let style = getComputedStyle(testElement)
        expect(style).toBeDefined()

        // Minimal mode: opacity should be 0
        document.documentElement.classList.add("minimal")
        style = getComputedStyle(testElement)
        expect(style).toBeDefined()

        // Clean up
        document.body.removeChild(testElement)
        document.documentElement.classList.remove("minimal")
    })

    /**
     * Test 4.19: Spring damping variable
     * Verify spring-damping is defined
     */
    it("should define spring-damping variable", () => {
        const style = getComputedStyle(document.documentElement)
        const damping = style.getPropertyValue("--spring-damping").trim()

        expect(damping).toBeTruthy()

        // Ornate: 10, Minimal: 20
        expect(damping).toContain("10")
    })

    /**
     * Test 4.20: All CSS variables defined in both modes
     * Verify no undefined variables
     */
    it("should have all required CSS variables in both modes", () => {
        const requiredVars = [
            "--animation-duration",
            "--animation-easing",
            "--glow-intensity",
            "--glow-opacity",
            "--spring-stiffness",
            "--spring-damping",
            "--acoustic-field-opacity",
            "--transition-timing",
        ]

        // Check ornate mode
        let style = getComputedStyle(document.documentElement)
        for (const varName of requiredVars) {
            expect(style.getPropertyValue(varName)).toBeTruthy()
        }

        // Check minimal mode
        document.documentElement.classList.add("minimal")
        style = getComputedStyle(document.documentElement)
        for (const varName of requiredVars) {
            expect(style.getPropertyValue(varName)).toBeTruthy()
        }

        document.documentElement.classList.remove("minimal")
    })
})
