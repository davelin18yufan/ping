import React from "react"
import { Text } from "react-native"
import { render, waitFor } from "@testing-library/react-native"
import { useStore } from "@tanstack/react-store"
import { chatStore } from "@/stores/chatStore"
import { socketStore } from "@/stores/socketStore"

describe("Store Integration in React Native", () => {
    beforeEach(() => {
        // Reset stores before each test
        chatStore.setState(() => ({
            currentConversationId: null,
            draftMessages: {},
            isTyping: {},
        }))

        socketStore.setState(() => ({
            isConnected: false,
            connectionError: null,
        }))
    })

    describe("chatStore Integration", () => {
        it("should subscribe to chatStore changes in React Native component", async () => {
            const TestComponent = () => {
                const conversationId = useStore(
                    chatStore,
                    (state) => state.currentConversationId
                )
                return (
                    <Text testID="conversation-id">
                        {conversationId || "None"}
                    </Text>
                )
            }

            const { getByTestId } = render(<TestComponent />)

            // Initial state should be "None"
            expect(getByTestId("conversation-id").props.children).toBe("None")

            // Update store
            chatStore.setState((state) => ({
                ...state,
                currentConversationId: "conv-123",
            }))

            // Wait for component to update
            await waitFor(() => {
                expect(getByTestId("conversation-id").props.children).toBe(
                    "conv-123"
                )
            })
        })

        it("should subscribe to multiple state values", async () => {
            const TestComponent = () => {
                const conversationId = useStore(
                    chatStore,
                    (state) => state.currentConversationId
                )
                const draftCount = useStore(
                    chatStore,
                    (state) => Object.keys(state.draftMessages).length
                )

                return (
                    <>
                        <Text testID="conversation-id">
                            {conversationId || "None"}
                        </Text>
                        <Text testID="draft-count">{draftCount}</Text>
                    </>
                )
            }

            const { getByTestId } = render(<TestComponent />)

            expect(getByTestId("conversation-id").props.children).toBe("None")
            expect(getByTestId("draft-count").props.children).toBe(0)

            // Update both states
            chatStore.setState((state) => ({
                ...state,
                currentConversationId: "conv-456",
                draftMessages: {
                    "conv-1": "Draft 1",
                    "conv-2": "Draft 2",
                },
            }))

            await waitFor(() => {
                expect(getByTestId("conversation-id").props.children).toBe(
                    "conv-456"
                )
                expect(getByTestId("draft-count").props.children).toBe(2)
            })
        })
    })

    describe("socketStore Integration", () => {
        it("should subscribe to socketStore changes in React Native component", async () => {
            const TestComponent = () => {
                const isConnected = useStore(
                    socketStore,
                    (state) => state.isConnected
                )
                return (
                    <Text testID="connection-status">
                        {isConnected ? "Connected" : "Disconnected"}
                    </Text>
                )
            }

            const { getByTestId } = render(<TestComponent />)

            // Initial state should be "Disconnected"
            expect(getByTestId("connection-status").props.children).toBe(
                "Disconnected"
            )

            // Update store
            socketStore.setState((state) => ({
                ...state,
                isConnected: true,
            }))

            // Wait for component to update
            await waitFor(() => {
                expect(getByTestId("connection-status").props.children).toBe(
                    "Connected"
                )
            })
        })

        it("should handle error state updates", async () => {
            const TestComponent = () => {
                const error = useStore(
                    socketStore,
                    (state) => state.connectionError
                )
                return <Text testID="error-message">{error || "No error"}</Text>
            }

            const { getByTestId } = render(<TestComponent />)

            expect(getByTestId("error-message").props.children).toBe("No error")

            // Set error
            socketStore.setState((state) => ({
                ...state,
                connectionError: "Network timeout",
            }))

            await waitFor(() => {
                expect(getByTestId("error-message").props.children).toBe(
                    "Network timeout"
                )
            })

            // Clear error
            socketStore.setState((state) => ({
                ...state,
                connectionError: null,
            }))

            await waitFor(() => {
                expect(getByTestId("error-message").props.children).toBe(
                    "No error"
                )
            })
        })
    })

    describe("Multiple Components Sharing Store", () => {
        it("should sync state across multiple components", async () => {
            const Component1 = () => {
                const conversationId = useStore(
                    chatStore,
                    (state) => state.currentConversationId
                )
                return <Text testID="comp1">{conversationId || "None"}</Text>
            }

            const Component2 = () => {
                const conversationId = useStore(
                    chatStore,
                    (state) => state.currentConversationId
                )
                return <Text testID="comp2">{conversationId || "None"}</Text>
            }

            const TestContainer = () => (
                <>
                    <Component1 />
                    <Component2 />
                </>
            )

            const { getByTestId } = render(<TestContainer />)

            expect(getByTestId("comp1").props.children).toBe("None")
            expect(getByTestId("comp2").props.children).toBe("None")

            // Update store - both components should receive the update
            chatStore.setState((state) => ({
                ...state,
                currentConversationId: "conv-789",
            }))

            await waitFor(() => {
                expect(getByTestId("comp1").props.children).toBe("conv-789")
                expect(getByTestId("comp2").props.children).toBe("conv-789")
            })
        })
    })
})
