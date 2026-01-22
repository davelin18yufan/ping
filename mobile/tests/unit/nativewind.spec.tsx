import React from "react"
import { View, Text } from "react-native"
import { render } from "@testing-library/react-native"

describe("NativeWind Configuration", () => {
    describe("Basic Tailwind Classes", () => {
        test("should apply Tailwind classes to View", () => {
            const { getByTestId } = render(
                <View testID="test-view" className="bg-blue-500 p-4">
                    <Text>Test</Text>
                </View>
            )

            const view = getByTestId("test-view")

            // In Jest test environment, NativeWind doesn't transform className
            // We verify that className prop is accepted
            expect(view).toBeDefined()
            expect(view.props.className).toBe("bg-blue-500 p-4")
        })

        test("should apply Tailwind classes to Text", () => {
            const { getByTestId } = render(
                <Text
                    testID="test-text"
                    className="text-lg font-bold text-gray-800"
                >
                    Hello World
                </Text>
            )

            const text = getByTestId("test-text")

            expect(text).toBeDefined()
            expect(text.props.className).toBe("text-lg font-bold text-gray-800")
        })

        test("should apply complex Tailwind classes", () => {
            const { getByTestId } = render(
                <View
                    testID="card"
                    className="flex flex-row items-center justify-between rounded-lg bg-white p-4 shadow-md"
                >
                    <Text>Card Content</Text>
                </View>
            )

            const card = getByTestId("card")

            expect(card).toBeDefined()
            expect(card.props.className).toContain("flex")
            expect(card.props.className).toContain("flex-row")
            expect(card.props.className).toContain("rounded-lg")
            expect(card.props.className).toContain("shadow-md")
        })
    })
})
