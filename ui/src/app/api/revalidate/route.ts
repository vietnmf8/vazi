import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
    try {
        const secret = request.nextUrl.searchParams.get("secret");

        if (secret !== process.env.REVALIDATE_SECRET) {
            return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
        }

        const body = await request.json();
        const { tag, path, paths } = body;

        if (!tag && !path && (!paths || paths.length === 0)) {
            return NextResponse.json(
                { message: "Missing tag or path in body" },
                { status: 400 }
            );
        }

        // Xóa Data Cache theo tag — mỗi section có cacheTag riêng nên chính xác tuyệt đối
        if (tag) {
            revalidateTag(tag as string, {});
        }

        // Purge Full Route Cache nếu caller yêu cầu (tham số tùy chọn)
        const pathList: string[] = [];
        if (path) pathList.push(path as string);
        if (paths && Array.isArray(paths)) pathList.push(...paths);

        for (const p of pathList) {
            revalidatePath(p);
        }

        return NextResponse.json({
            revalidated: true,
            now: Date.now(),
            tag,
            ...(pathList.length > 0 ? { paths: pathList } : {}),
        });
    } catch (err: any) {
        console.error(`[Revalidate API] Error:`, err);
        return NextResponse.json(
            { message: "Error revalidating", error: err.message },
            { status: 500 }
        );
    }
}
