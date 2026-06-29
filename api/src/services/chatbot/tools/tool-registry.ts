import { FunctionDeclaration } from "@google/generative-ai";

// UI_MANIPULATION: tool điều khiển vật lý lên giao diện (chuột ảo, chuyển trang, cuộn trang) — hiện blue border indicator.
// DATA_RETRIEVAL: tool chỉ đọc dữ liệu từ DB/service, không đụng tới UI — chạy ngầm, không hiện blue border.
export type ToolCategory = "UI_MANIPULATION" | "DATA_RETRIEVAL";

export interface ToolDefinition {
    declaration: FunctionDeclaration;
    execute: (args: any, context?: any) => Promise<any>;
    category: ToolCategory;
}

export class ToolRegistry {
    private tools = new Map<string, ToolDefinition>();

    register(name: string, tool: ToolDefinition) {
        this.tools.set(name, tool);
    }

    get(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    getCategory(name: string): ToolCategory | undefined {
        return this.tools.get(name)?.category;
    }

    getDeclarations(): FunctionDeclaration[] {
        return Array.from(this.tools.values()).map(t => t.declaration);
    }

    getNamesByCategory(category: ToolCategory): string[] {
        return Array.from(this.tools.entries())
            .filter(([, t]) => t.category === category)
            .map(([name]) => name);
    }
}

export const aiToolRegistry = new ToolRegistry();
