import { render, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SystemEventsProvider } from "./SystemEventsProvider";
import { useRouter } from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
    useRouter: vi.fn(),
}));

// Mock pusher-js
const mockBind = vi.fn();
const mockUnbindAll = vi.fn();
const mockDisconnect = vi.fn();
const mockSubscribe = vi.fn(() => ({
    bind: mockBind,
    unbind_all: mockUnbindAll,
}));

vi.mock("pusher-js", () => {
    return {
        default: class MockPusher {
            constructor() {}
            subscribe = mockSubscribe;
            disconnect = mockDisconnect;
        },
    };
});

describe("SystemEventsProvider", () => {
    let mockRefresh: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockRefresh = vi.fn();
        (useRouter as any).mockReturnValue({
            refresh: mockRefresh,
        });

        // Set required env vars
        process.env.NEXT_PUBLIC_SOKETI_KEY = "test-key";
    });

    it("should subscribe to system-events channel", () => {
        render(<SystemEventsProvider />);
        
        expect(mockSubscribe).toHaveBeenCalledWith("system-events");
        expect(mockBind).toHaveBeenCalledWith("cache_revalidated", expect.any(Function));
    });

    it("should call router.refresh() when cache_revalidated event is triggered", () => {
        render(<SystemEventsProvider />);
        
        // Find the registered callback
        const callback = mockBind.mock.calls.find((call) => call[0] === "cache_revalidated")?.[1];
        expect(callback).toBeDefined();

        // Trigger it
        act(() => {
            callback({ tag: "nationalities" });
        });

        expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it("should clean up on unmount", () => {
        const { unmount } = render(<SystemEventsProvider />);
        
        unmount();

        expect(mockUnbindAll).toHaveBeenCalled();
        expect(mockDisconnect).toHaveBeenCalled();
    });
});
