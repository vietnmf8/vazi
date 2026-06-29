---
activation: model_decision
description: Apply when using shadcn/ui or Radix components to prevent invalid HTML nesting.
- "src/**/*.jsx"
- "src/**/*.tsx"
globs: components/ui/*.tsx
---

# shadcn/ui Semantic HTML Awareness

## ⚠️ HTML Nesting Rules (Browser-enforced)

Browser sẽ tự động "fix" invalid nesting → mất hydration mismatch.
**LUÔN check component shadcn render ra thẻ gì TRƯỚC khi nest.**

## Bảng tra cứu component → thẻ output

| Component               | Renders                      | Cannot contain                         |
| ----------------------- | ---------------------------- | -------------------------------------- |
| `<CardTitle>`           | `<h3>` (default)             | `<h1>`, `<h2>`, `<p>`, block-level     |
| `<CardDescription>`     | `<p>`                        | `<div>`, `<p>`, `<h*>`, `<ul>`, `<ol>` |
| `<DialogTitle>`         | `<h2>`                       | `<h*>`, `<p>`, block-level             |
| `<DialogDescription>`   | `<p>`                        | `<div>`, `<p>`, `<h*>`, blocks         |
| `<AlertTitle>`          | `<h5>`                       | `<p>`, `<h*>`, blocks                  |
| `<AlertDescription>`    | `<div>` (có `prose` styling) | OK with most                           |
| `<Label>`               | `<label>`                    | nested `<label>`, interactive elements |
| `<Button>`              | `<button>`                   | `<a>`, `<button>`, form controls       |
| `<DropdownMenuItem>`    | `<div role="menuitem">`      | interactive nested                     |
| `<Badge>`               | `<div>` (inline-flex)        | block-level                            |
| `<Tabs>` → `<TabsList>` | `<div role="tablist">`       | OK                                     |

## ❌ Common Mistakes (Hydration Errors)

```jsx
// ❌ SAI: <p> trong <CardDescription> (là <p>)
<CardDescription>
    <p className="text-sm">Hello</p>  {/* <p> inside <p> */}
</CardDescription>

// ✅ ĐÚNG: dùng span hoặc bỏ wrapper
<CardDescription className="text-sm">Hello</CardDescription>

// ❌ SAI: heading trong DialogDescription
<DialogDescription>
    <h3>Section</h3>  {/* <h3> inside <p> */}
</DialogDescription>

// ✅ ĐÚNG: dùng asChild để chuyển element
<DialogDescription asChild>
    <div>
        <h3>Section</h3>
        <p>Content</p>
    </div>
</DialogDescription>

// ❌ SAI: <a> trong <Button>
<Button>
    <Link href="/x">Go</Link>  {/* <a> inside <button> */}
</Button>

// ✅ ĐÚNG: dùng asChild prop
<Button asChild>
    <Link href="/x">Go</Link>
</Button>
```

## ✅ Quy tắc kiểm tra TRƯỚC KHI viết

1. **Mở `src/components/ui/[component].jsx` xem JSX root tag**
2. **Hỏi:** "Tôi đang nest cái gì vào? Có hợp lệ không?"
3. **Nếu cần chuyển element:** dùng `asChild` prop (Radix pattern)
4. **List rendering:** `<ul>` chỉ chứa `<li>`, không `<div>`
5. **Heading hierarchy:** `<h1>` → `<h2>` → `<h3>` tuần tự, KHÔNG nhảy cóc

## Test khi build

```bash
# Next.js sẽ throw hydration error trong console nếu sai
npm run dev
# Mở DevTools Console → check warning "validateDOMNesting"
```
