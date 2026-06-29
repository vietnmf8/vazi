# Skill: Add AI Agent Tool

**Trigger:** "thêm tool cho AI", "AI tool mới", "agent capability", "add chatbot action"

## Khi nào dùng

Khi cần mở rộng AI chatbot agent với capability mới (e.g. database query, code analysis, image processing).

## Workflow

### Bước 1: Xác định tool spec

```
Tên tool:        e.g. "search_db"
Input shape:     { query: string, table: string }
Output shape:    string (max 10KB)
Side effects:    Read-only? Write to DB? External API?
Security risks:  SQL injection? PII exposure? Rate limits?
```

### Bước 2: Update JSON Schema (src/configs/ai.config.ts)

```typescript
// Thêm value vào enum action
responseFormat: {
    type: "json_schema",
    json_schema: {
        name: "agent_action",
        strict: true,
        schema: {
            type: "object",
            properties: {
                thought: { type: "string" },
                action: {
                    type: "string",
                    enum: [
                        "read_file",
                        "write_file",
                        "bash",
                        "fetch_url",
                        "search_db",        // ← THÊM
                        "respond",
                    ],
                },
                payload: { type: "object" },
            },
            required: ["thought", "action", "payload"],
            additionalProperties: false,
        },
    },
}
```

### Bước 3: Add handler vào agent.service.ts

```typescript
private async runTool(action: string, payload: any): Promise<ToolResult> {
    const handlers: Record<string, (p: any) => Promise<string>> = {
        read_file: async (p) => this.readFile(p?.path),
        write_file: async (p) => this.writeFile(p?.path, p?.content),
        bash: async (p) => this.bash(p?.command),
        fetch_url: async (p) => this.fetchUrl(p?.url),
        search_db: async (p) => this.searchDb(p?.query, p?.table),  // ← THÊM
    }
    // ...
}

private async searchDb(query: string, table: string): Promise<string> {
    // SECURITY: Whitelist tables
    const allowedTables = ["products", "posts", "articles"]   // KHÔNG users, sessions, etc.
    if (!allowedTables.includes(table)) {
        throw new Error(`Table not allowed: ${table}`)
    }

    // SECURITY: Use parameterized query, no raw SQL
    const results = await (prisma as any)[table].findMany({
        where: {
            OR: [
                { title: { contains: query } },
                { description: { contains: query } },
            ],
        },
        take: 10,                    // Cap results
        select: { id: true, title: true, description: true },  // Whitelist fields
    })

    return JSON.stringify(results).slice(0, 10000)   // 10KB cap
}
```

### Bước 4: Update system prompt

```typescript
// src/services/chatbot/prompts.ts
export const SYSTEM_PROMPT = `
You are an AI assistant with access to these tools:
 
- read_file(path): Read file content
- write_file(path, content): Write file
- bash(command): Run whitelisted shell commands
- fetch_url(url): Fetch external URL (no local network)
- search_db(query, table): Search database (allowed: products, posts, articles)  ← THÊM
- respond(text): Final response to user
 
Choose actions to help user. Use search_db when user asks about products, posts, or articles.
Always finish with action="respond".
`;
```

### Bước 5: Security checklist (BẮT BUỘC review)

- [ ] Input validation (no SQL injection, command injection, path traversal)
- [ ] Output sanitization (no PII leak, no internal IDs in plain text)
- [ ] Whitelist (tables, paths, commands, URLs)
- [ ] Rate limit per user/conversation
- [ ] Audit log (Sentry breadcrumb mỗi tool call)
- [ ] Timeout (max 5-10s per tool)
- [ ] Output cap (max 10KB to prevent context bloat)
- [ ] Error message KHÔNG leak internal info

### Bước 6: Test

```typescript
// Manual test trong dev environment
const result = await agentService.handleMessage(
    SYSTEM_PROMPT,
    "Find products related to 'laptop'",
    [],
);
console.log(result);
// Expected: AI calls search_db with { query: "laptop", table: "products" }
// Then responds with formatted product list
```

## Anti-patterns

| ❌ DON'T                         | ✅ DO                              |
| -------------------------------- | ---------------------------------- |
| Blacklist tables (`!== "users"`) | Whitelist allowed tables           |
| Raw SQL with user input          | Parameterized via Prisma           |
| Return entire DB rows            | Select specific fields only        |
| Unlimited result rows            | Cap to 10                          |
| No timeout                       | Timeout 5-10s                      |
| Return full error.message        | Sanitize error before return to AI |

## Checklist

- [ ] JSON Schema enum updated với action mới
- [ ] Handler added vào `runTool()`
- [ ] System prompt mentions new tool + when to use
- [ ] Input validation
- [ ] Output capped (10KB)
- [ ] Security whitelist (tables/paths/commands)
- [ ] Timeout configured
- [ ] Sentry breadcrumb for audit
- [ ] Manual test passes
- [ ] Unit test for handler logic
