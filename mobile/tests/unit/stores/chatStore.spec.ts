import { chatStore } from "@/stores/chatStore"

describe("chatStore", () => {
    beforeEach(() => {
        // Reset store to initial state before each test
        chatStore.setState(() => ({
            currentConversationId: null,
            draftMessages: {},
            isTyping: {},
        }))
    })

    describe("Initialization", () => {
        it("should create chatStore with initial state", () => {
            const state = chatStore.state

            expect(state.currentConversationId).toBeNull()
            expect(state.draftMessages).toEqual({})
            expect(state.isTyping).toEqual({})
        })
    })

    describe("Current Conversation Management", () => {
        it("should update current conversation ID", () => {
            const conversationId = "conv-123"

            chatStore.setState((state) => ({
                ...state,
                currentConversationId: conversationId,
            }))

            expect(chatStore.state.currentConversationId).toBe(conversationId)
        })

        it("should clear current conversation ID", () => {
            // Set a conversation ID first
            chatStore.setState((state) => ({
                ...state,
                currentConversationId: "conv-123",
            }))

            // Clear it
            chatStore.setState((state) => ({
                ...state,
                currentConversationId: null,
            }))

            expect(chatStore.state.currentConversationId).toBeNull()
        })
    })

    describe("Draft Messages Management", () => {
        it("should store draft message for a conversation", () => {
            const conversationId = "conv-123"
            const draftContent = "Hello, this is a draft message"

            chatStore.setState((state) => ({
                ...state,
                draftMessages: {
                    ...state.draftMessages,
                    [conversationId]: draftContent,
                },
            }))

            expect(chatStore.state.draftMessages[conversationId]).toBe(
                draftContent
            )
        })

        it("should clear draft message for a specific conversation", () => {
            const conversationId = "conv-123"

            // Set draft message first
            chatStore.setState((state) => ({
                ...state,
                draftMessages: {
                    ...state.draftMessages,
                    [conversationId]: "Draft message",
                },
            }))

            // Clear the draft
            chatStore.setState((state) => {
                const { [conversationId]: _, ...restDrafts } =
                    state.draftMessages
                return {
                    ...state,
                    draftMessages: restDrafts,
                }
            })

            expect(
                chatStore.state.draftMessages[conversationId]
            ).toBeUndefined()
        })

        it("should handle multiple draft messages", () => {
            chatStore.setState((state) => ({
                ...state,
                draftMessages: {
                    "conv-1": "Draft 1",
                    "conv-2": "Draft 2",
                    "conv-3": "Draft 3",
                },
            }))

            expect(Object.keys(chatStore.state.draftMessages)).toHaveLength(3)
            expect(chatStore.state.draftMessages["conv-1"]).toBe("Draft 1")
            expect(chatStore.state.draftMessages["conv-2"]).toBe("Draft 2")
            expect(chatStore.state.draftMessages["conv-3"]).toBe("Draft 3")
        })
    })

    describe("Typing Indicators", () => {
        it("should set typing indicator for a conversation", () => {
            const conversationId = "conv-123"

            chatStore.setState((state) => ({
                ...state,
                isTyping: {
                    ...state.isTyping,
                    [conversationId]: true,
                },
            }))

            expect(chatStore.state.isTyping[conversationId]).toBe(true)
        })

        it("should clear typing indicator", () => {
            const conversationId = "conv-123"

            // Set typing first
            chatStore.setState((state) => ({
                ...state,
                isTyping: {
                    ...state.isTyping,
                    [conversationId]: true,
                },
            }))

            // Clear typing
            chatStore.setState((state) => ({
                ...state,
                isTyping: {
                    ...state.isTyping,
                    [conversationId]: false,
                },
            }))

            expect(chatStore.state.isTyping[conversationId]).toBe(false)
        })
    })
})
