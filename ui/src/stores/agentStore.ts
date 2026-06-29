import { create } from 'zustand';



interface AgentStore {
  sendSystemMessageRef?: (msg: string) => void;
  aiIndicator: { isActing: boolean; message: string | null };
  visibleAiContexts: any[];
  // Trạng thái kích hoạt virtual click — mỗi lần trigger mang id mới để effect phân biệt.
  // `optionCode` (optional): khi có, VirtualMouseEngine sau khi click mở field sẽ tiếp tục
  // tìm và click option tương ứng trong dropdown (Phase 2 focus_ui_field — chọn quốc gia).
  virtualClick: { target: string; id: number; intent?: string; sessionId?: string; optionCode?: string; lang?: string } | null;
  // Trạng thái kích hoạt scroll thuần (không click) — top/bottom toàn site hoặc đến 1 section
  scrollCommand: { mode: "top" | "bottom" | "element"; target?: string; id: number } | null;
  setSendSystemMessageRef: (fn: (msg: string) => void) => void;
  triggerAiActionIndicator: (message: string) => void;
  setVisibleAiContexts: (contexts: any[]) => void;
  triggerVirtualClick: (target: string, intent?: string, sessionId?: string, lang?: string) => void;
  triggerSelectOption: (target: string, optionCode: string) => void;
  triggerScrollPage: (mode: "top" | "bottom" | "element", target?: string) => void;
}

let indicatorTimer: NodeJS.Timeout | null = null;

export const useAgentStore = create<AgentStore>((set) => ({
  aiIndicator: { isActing: false, message: null },
  visibleAiContexts: [],
  // Mặc định chưa có virtual click nào đang chờ
  virtualClick: null,
  // Mặc định chưa có scroll command nào đang chờ
  scrollCommand: null,

  setSendSystemMessageRef: (fn) => set({ sendSystemMessageRef: fn }),
  triggerAiActionIndicator: (message) => {
    if (indicatorTimer) clearTimeout(indicatorTimer);
    
    set({ aiIndicator: { isActing: true, message } });
    
    indicatorTimer = setTimeout(() => {
      set((state) => ({
        aiIndicator: { ...state.aiIndicator, isActing: false }
      }));
    }, 2500);
  },
  setVisibleAiContexts: (contexts) => set({ visibleAiContexts: contexts }),
  // Mỗi lần gọi sẽ tạo id mới từ Date.now() để useEffect trong VirtualMouseEngine nhận biết thay đổi
  triggerVirtualClick: (target, intent, sessionId, lang) => set({ virtualClick: { target, id: Date.now(), intent, sessionId, lang } }),
  // Tái dùng đúng field `virtualClick` (không tạo state riêng) — chỉ khác là có thêm `optionCode`,
  // VirtualMouseEngine tự phân nhánh tiếp bước "chọn option" sau khi click mở field xong.
  triggerSelectOption: (target, optionCode) => set({ virtualClick: { target, id: Date.now(), optionCode } }),
  // Tương tự triggerVirtualClick nhưng cho lệnh cuộn thuần (không click)
  triggerScrollPage: (mode, target) => set({ scrollCommand: { mode, target, id: Date.now() } }),
}));

if (typeof window !== "undefined") {
  (window as any).useAgentStore = useAgentStore;
}
