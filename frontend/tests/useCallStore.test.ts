// Test cho useCallStore
import { describe, it, expect, beforeEach } from "vitest";
import { useCallStore } from "../src/stores/useCallStore";

describe("useCallStore", () => {
  beforeEach(() => {
    useCallStore.setState({ active: null, incoming: null });
  });

  it("initial state is empty", () => {
    expect(useCallStore.getState().active).toBeNull();
    expect(useCallStore.getState().incoming).toBeNull();
  });

  it("sets incoming call", () => {
    const incoming = {
      callId: "c1",
      fromUserId: "u2",
      conversationId: "conv1",
      type: "audio" as const,
    };
    useCallStore.getState().setIncomingCall(incoming);
    expect(useCallStore.getState().incoming).toEqual(incoming);
  });

  it("clears everything", () => {
    useCallStore.getState().setIncomingCall({
      callId: "c1",
      fromUserId: "u2",
      conversationId: "conv1",
      type: "audio",
    });
    useCallStore.getState().clear();
    expect(useCallStore.getState().incoming).toBeNull();
    expect(useCallStore.getState().active).toBeNull();
  });
});
