/**
 * Chuẩn hoá DATABASE_URL cho @prisma/adapter-mariadb.
 *
 * MySQL 8 mặc định `caching_sha2_password` — driver mariadb cần
 * `allowPublicKeyRetrieval=true` nếu không có RSA key phía client,
 * nếu không pool sẽ timeout ~10s và mọi query Prisma trả 500.
 */
export function buildMariaDbConnectionUrl(databaseUrl: string): string {
    const url = new URL(databaseUrl);

    if (!url.searchParams.has("allowPublicKeyRetrieval")) {
        url.searchParams.set("allowPublicKeyRetrieval", "true");
    }

    // Khớp mặc định adapter Prisma — tránh prepared statement cache lỗi trên một số host
    if (!url.searchParams.has("prepareCacheLength")) {
        url.searchParams.set("prepareCacheLength", "0");
    }

    return url.toString();
}
