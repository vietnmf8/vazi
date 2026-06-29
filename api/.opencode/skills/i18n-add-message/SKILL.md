# Skill: Add i18n Message

**Trigger:** "thêm message", "thêm i18n", "thêm dịch", "add translation", "Vietnamese error"

## Workflow nhanh

Khi cần thêm 1 message mới cho user (error/success/notification):

### Bước 1: Quyết định namespace

| Loại                                     | File                                    |
| ---------------------------------------- | --------------------------------------- |
| Error chung (validation, not_found, ...) | `common.json` → `errors.*`              |
| Validation rules                         | `common.json` → `validation.*`          |
| Success message                          | `common.json` → `success.*`             |
| Auth-specific                            | `auth.json`                             |
| Resource-specific                        | `<resource>.json` (e.g. `product.json`) |
| Email subjects/CTAs                      | `email.json`                            |

### Bước 2: Add key vào BOTH `vi` AND `en` (đồng thời!)

```json
// src/locales/vi/product.json
{
    // ... existing keys
    "out_of_stock": "Sản phẩm đã hết hàng"
}
```

```json
// src/locales/en/product.json
{
    "out_of_stock": "Out of stock"
}
```

### Bước 3: Use trong code

#### A. Trong service (throw error)

```typescript
import { BusinessError } from "@/utils/errors";

class ProductService {
    async order(productId: string) {
        const product = await this.getById(productId);
        if (product.stock <= 0) {
            throw new BusinessError("product.out_of_stock"); // ← i18n key
        }
        // ...
    }
}
```

#### B. Trong controller (success message)

```typescript
export const order = async (req: Request, res: Response) => {
    const order = await productService.order(req.params.id);
    res.success(order, httpCodes.created, {
        message: req.t("product.order_success"),
    });
};
```

#### C. Trong validator (validation error)

```typescript
export const orderSchema = z.object({
    productId: z.string().regex(/^c[a-z0-9]{24}$/, {
        message: "validation.id.invalid",
    }),
    quantity: z.number().int().positive({
        message: "product.invalid_quantity",
    }),
});
```

#### D. Với interpolation

```json
// vi
{ "low_stock_warning": "Chỉ còn {{count}} sản phẩm" }

// en
{ "low_stock_warning": "Only {{count}} left in stock" }
```

```typescript
const message = req.t("product.low_stock_warning", { count: product.stock });
```

#### E. Plural

```json
// vi (không phân biệt singular/plural)
{
    "items_count_one": "{{count}} sản phẩm",
    "items_count_other": "{{count}} sản phẩm"
}

// en
{
    "items_count_one": "1 item",
    "items_count_other": "{{count}} items"
}
```

```typescript
req.t("product.items_count", { count: 5 }); // → "5 items" / "5 sản phẩm"
```

## Naming convention

```
<feature>.<sub-feature>.<action_or_state>

Examples:
auth.register.success
auth.register.email_exists
auth.login.invalid_credentials
product.out_of_stock
product.create_success
errors.internal_server
validation.email.required
```

KHÔNG dùng:

- `errorRegister1`, `MSG_001` (không readable)
- `errors-internal-server` (dùng dot, không dash)
- `Login Success` (key không có space, không Capitalize)

## Common patterns

### Error message security

```json
// ❌ SAI: Leak internal info
{ "user_not_found": "User c123abc456 not found in database" }

// ✅ ĐÚNG: Generic
{ "user_not_found": "Không tìm thấy người dùng" }
```

### Same message for login security

```typescript
// ✅ Email không tồn tại vs sai password → cùng message
// (Prevent user enumeration)
throw new AuthError("auth.invalid_credentials");
```

## Test missing translations

```bash
# Set Accept-Language: en và check tất cả endpoints
curl -H "Accept-Language: en" http://localhost:3000/api/v1/products

# Nếu thấy raw key (e.g. "product.not_found") thay vì English text
# → Missing en translation, add ngay
```

## Checklist

- [ ] Key thêm vào BOTH `vi` AND `en`
- [ ] Naming theo `<feature>.<sub>.<action>` dot notation
- [ ] Generic message (không leak internal info)
- [ ] Test với `Accept-Language: vi` → đúng Vietnamese
- [ ] Test với `Accept-Language: en` → đúng English
- [ ] Test với `?lng=en` → đúng English
- [ ] Nếu có `{{var}}` → test interpolation
- [ ] Nếu có plural → test với count=1 và count>1
- [ ] KHÔNG dùng hardcoded text bất kỳ đâu (grep `"Đã"`, `"Lỗi"` trong code)
