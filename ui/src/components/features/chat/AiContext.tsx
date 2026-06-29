import React from "react"

interface AiContextProps {
  schema: Record<string, any>
}

/**
 * Component dùng để tiêm (inject) schema/enum ẩn vào DOM.
 * Component này không hiển thị trên giao diện, nhưng useChat.ts
 * sẽ trích xuất data-ai-context của nó để truyền vào Context cho AI.
 */
export function AiContext({ schema }: AiContextProps) {
  const jsonString = React.useMemo(() => JSON.stringify(schema), [schema]);

  return (
    <div
      data-ai-context={jsonString}
      style={{ display: "none" }}
      aria-hidden="true"
    />
  )
}
