import { describe, test, expect, beforeEach } from "vitest";
import { chatStore } from "@/stores/chatStore";

describe("chatStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    chatStore.setState(() => ({
      currentConversationId: null,
      draftMessages: {},
      isTyping: {},
    }));
  });

  test("chatStore should initialize with default values", () => {
    const state = chatStore.state;

    expect(state.currentConversationId).toBeNull();
    expect(state.draftMessages).toEqual({});
    expect(state.isTyping).toEqual({});
  });

  test("should update current conversation ID", () => {
    const conversationId = "conv-123";

    chatStore.setState((state) => ({
      ...state,
      currentConversationId: conversationId,
    }));

    expect(chatStore.state.currentConversationId).toBe(conversationId);
  });

  test("should store draft message for conversation", () => {
    const conversationId = "conv-123";
    const draftMessage = "Hello, this is a draft";

    chatStore.setState((state) => ({
      ...state,
      draftMessages: {
        ...state.draftMessages,
        [conversationId]: draftMessage,
      },
    }));

    expect(chatStore.state.draftMessages[conversationId]).toBe(draftMessage);
  });

  test("should clear draft message for conversation", () => {
    const conversationId = "conv-123";

    // First, set a draft
    chatStore.setState((state) => ({
      ...state,
      draftMessages: { [conversationId]: "Draft message" },
    }));

    // Then, clear it
    chatStore.setState((state) => {
      const { [conversationId]: _, ...rest } = state.draftMessages;
      return { ...state, draftMessages: rest };
    });

    expect(chatStore.state.draftMessages[conversationId]).toBeUndefined();
  });
});
