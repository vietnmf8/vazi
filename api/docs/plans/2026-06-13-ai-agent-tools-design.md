# Nâng Cấp AI Chatbot thành AI Agent (Function Calling) Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Nâng cấp AI Chatbot hiện tại thành AI Agent bằng cách sử dụng Native Function Calling của Gemini SDK, cho phép AI thực thi các nghiệp vụ của FASTVISA một cách tự động với trải nghiệm người dùng theo thời gian thực.

**Architecture:** Tách biệt phần khai báo các Tools (Schema + Execution Logic) vào thư mục `src/services/chatbot/tools/`. `gemini.service.ts` sẽ chịu trách nhiệm giao tiếp vòng lặp: gửi tools schema cho Gemini, nhận `functionCall`, emit trạng thái (ví dụ "Đang tra cứu dữ liệu...") qua Pusher để UI hiển thị loading, thực thi tool logic tại Backend, và gửi lại `functionResponse` cho AI để lấy kết quả cuối.

**Tech Stack:** Node.js, TypeScript, `@google/generative-ai`, Pusher, Prisma (nếu cần query DB trong tool).

## Checklist Tiến Độ

- [x] **Task 1:** Tạo thư mục `src/services/chatbot/tools/`, viết `tool-registry.ts` và `index.ts`.
- [x] **Task 2:** Triển khai tool đầu tiên `check_visa_status.tool.ts` với Schema và Logic.
- [x] **Task 3:** Cập nhật `gemini.service.ts` để cấu hình model với `tools` parameter.
- [x] **Task 4:** Xử lý vòng lặp Function Calling Execution trong `gemini.service.ts` (chặn `functionCall`, chạy hàm, gửi `functionResponse`).
- [x] **Task 5:** Truyền callback vào `gemini.service.ts` từ `chat.service.ts` để emit sự kiện Pusher `tool_processing` cập nhật UX realtime.
- [x] **Task 6:** Thực thi 10 Bước Verification chuẩn xác (Bao gồm Type Check, cURL Test, Check Log, Lint, Build).

## User Flow & Kết Quả Kỳ Vọng

**User Flow Thực Tế:**
1. Khách hàng nhắn tin: *"Kiểm tra giúp tôi hồ sơ visa E12345678"*.
2. **Backend**: Nhận request, gọi Gemini kèm nội dung chat và schema của công cụ `check_visa_status`.
3. **Gemini**: Phân tích câu hỏi và trả về đối tượng `functionCall` với tham số `applicationCode="E12345678"`.
4. **Backend (UX Update)**: Bắt được `functionCall`, lập tức emit event Pusher `tool_processing` (VD: "Đang tra cứu dữ liệu..."). Frontend UI nhận event này và hiện trạng thái loading cụ thể.
5. **Backend (Execution)**: Thực thi logic truy vấn DB bằng tham số lấy được. Trả kết quả JSON về cho hệ thống (VD: `{ status: "PROCESSING" }`) dưới dạng `functionResponse`.
6. **Gemini**: Đọc `functionResponse` và tiếp tục stream text tự nhiên: *"Hồ sơ E12345678 của bạn hiện đang được xử lý..."*.
7. **Backend**: Kết thúc stream, giao diện người dùng hiển thị tin nhắn cuối cùng, tắt loading.

**Kết Quả Kỳ Vọng:**
- Chuyển đổi trơn tru sang AI Agent tự hành.
- Trải nghiệm người dùng tốt hơn nhờ UX Loading realtime.
- Kiến trúc Code dễ dàng mở rộng (chỉ cần tạo thêm file tool ở thư mục `tools` và đăng ký vào registry).

---

### Task 1: Tạo Tool Registry và Base Tool Interface

**Files:**
- Create: `d:/F8_K15_BTVN/FASTVISA/api/src/services/chatbot/tools/index.ts`
- Create: `d:/F8_K15_BTVN/FASTVISA/api/src/services/chatbot/tools/tool-registry.ts`

**Step 1: Write the tool registry structure**
Tạo interface `ToolDefinition` và một registry quản lý các tools để dễ mở rộng.

```typescript
// d:/F8_K15_BTVN/FASTVISA/api/src/services/chatbot/tools/tool-registry.ts
import { FunctionDeclaration } from "@google/generative-ai";

export interface ToolDefinition {
    declaration: FunctionDeclaration;
    execute: (args: any, context?: any) => Promise<any>;
}

export class ToolRegistry {
    private tools = new Map<string, ToolDefinition>();

    register(name: string, tool: ToolDefinition) {
        this.tools.set(name, tool);
    }

    get(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    getDeclarations(): FunctionDeclaration[] {
        return Array.from(this.tools.values()).map(t => t.declaration);
    }
}

export const aiToolRegistry = new ToolRegistry();
```

### Task 2: Implement Tool Đầu Tiên (Tra cứu trạng thái Visa)

**Files:**
- Create: `d:/F8_K15_BTVN/FASTVISA/api/src/services/chatbot/tools/check-visa-status.tool.ts`

**Step 1: Write tool logic & declaration**
```typescript
// d:/F8_K15_BTVN/FASTVISA/api/src/services/chatbot/tools/check-visa-status.tool.ts
import { FunctionDeclaration, Schema, Type } from "@google/generative-ai";
import { aiToolRegistry } from "./tool-registry";

const checkVisaStatusDeclaration: FunctionDeclaration = {
    name: "check_visa_status",
    description: "Kiểm tra trạng thái hồ sơ xin visa (E-Visa) dựa trên mã hồ sơ (application id) hoặc số passport.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            applicationCode: {
                type: Type.STRING,
                description: "Mã hồ sơ xin visa (ví dụ: E12345678)"
            },
            passportNumber: {
                type: Type.STRING,
                description: "Số hộ chiếu của người xin visa"
            }
        },
        required: []
    }
};

async function executeCheckVisaStatus(args: { applicationCode?: string, passportNumber?: string }) {
    // Logic giả lập hoặc query DB thực tế
    return {
        status: "PROCESSING",
        message: `Hồ sơ ${args.applicationCode || args.passportNumber} đang được xử lý bởi Cục QLXNC. Vui lòng chờ thêm 1-2 ngày làm việc.`,
        expectedDate: "2026-06-15"
    };
}

aiToolRegistry.register("check_visa_status", {
    declaration: checkVisaStatusDeclaration,
    execute: executeCheckVisaStatus
});
```

**Step 2: Export in index.ts**
```typescript
// d:/F8_K15_BTVN/FASTVISA/api/src/services/chatbot/tools/index.ts
import "./check-visa-status.tool";
export { aiToolRegistry } from "./tool-registry";
```

### Task 3: Tích hợp Tools vào `gemini.service.ts`

**Files:**
- Modify: `d:/F8_K15_BTVN/FASTVISA/api/src/services/chatbot/gemini.service.ts`

**Step 1: Khai báo Tools khi init model**
Cập nhật hàm `getModel()` để đính kèm tools từ registry.

```typescript
import { aiToolRegistry } from "./tools";

function getModel(additionalContext?: string) {
    // ... logic hiện tại ...
    const tools = [{ functionDeclarations: aiToolRegistry.getDeclarations() }];
    return genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction, tools });
}
```

**Step 2: Xử lý vòng lặp Function Calling trong generateVisaAssistantReply**
Cập nhật logic khi `result.response.functionCalls()` có dữ liệu. Lặp lại gửi `functionResponse` cho đến khi có text (trong cả bản streaming). Sử dụng vòng lặp an toàn (max 3 lượt tool call) để tránh infinite loop.

### Task 4: Emit Sự Kiện Pusher Cho UX

**Files:**
- Modify: `d:/F8_K15_BTVN/FASTVISA/api/src/services/chat.service.ts`

**Step 1: Truyền callback onToolCall vào gemini.service**
Cho phép `gemini.service.ts` gọi ngược lại `chat.service.ts` (truyền sessionId/pusher) để emit sự kiện `tool_processing` kèm mô tả hành động đang thực hiện.

### Task 5: Phase Verification (Bắt buộc)

Tiến hành kiểm chứng chặt chẽ theo `phase-verification/SKILL.md` với 10 bước chuẩn.

**Step 1: TypeScript & Lint**
- Chạy `npx tsc --noEmit` ở `@api`. BẮT BUỘC pass 100%.
- Chạy `npm run lint`.

**Step 2: Live API Testing (cURL) & Giả Lập Tình Huống**
Gửi request cURL để giả lập môi trường người dùng thật chat với API.
- **Case 1 (Happy Path)**: "Kiểm tra visa E12345". (Pass criteria: Stream kết thúc trả đúng thông tin, log server ghi nhận đúng Tool Call).
- **Case 3 (Edge - Error Handling)**: Giả lập tool throw error, check hệ thống không sập, AI trả lời thân thiện.
*Kết quả các Case sẽ được lưu input/output text vào báo cáo nghiệm thu.*

**Step 3: Log Analysis**
- Kiểm tra `@api/api.log` để chắc chắn không bị `TypeError` khi map args.

**Step 4: Build & Final Check**
- Chạy `npm run build` ở `@api`.
