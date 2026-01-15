import { describe, test, expect, beforeEach } from "vitest";
import { socketStore } from "@/stores/socketStore";

describe("socketStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    socketStore.setState(() => ({
      isConnected: false,
      connectionError: null,
    }));
  });

  test("socketStore should initialize with default values", () => {
    const state = socketStore.state;

    expect(state.isConnected).toBe(false);
    expect(state.connectionError).toBeNull();
  });

  test("should update connection status", () => {
    socketStore.setState((state) => ({
      ...state,
      isConnected: true,
    }));

    expect(socketStore.state.isConnected).toBe(true);
  });

  test("should store connection error", () => {
    const errorMessage = "Connection timeout";

    socketStore.setState((state) => ({
      ...state,
      isConnected: false,
      connectionError: errorMessage,
    }));

    expect(socketStore.state.isConnected).toBe(false);
    expect(socketStore.state.connectionError).toBe(errorMessage);
  });
});
