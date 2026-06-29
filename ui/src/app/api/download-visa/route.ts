import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const fileUrl = searchParams.get("url");
    const filename = searchParams.get("filename") || "Vietnam-Evisa.pdf";

    if (!fileUrl) {
        return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // TẠI SAO: Server-side fetch của Next.js yêu cầu một URL tuyệt đối (absolute URL).
    // Nếu URL nhận từ backend là đường dẫn tương đối (ví dụ /uploads/...), fetch sẽ ném lỗi "Failed to parse URL".
    // Vì vậy ta cần bổ sung thêm host của API từ biến môi trường NEXT_PUBLIC_API_URL nếu nó là relative path.
    let absoluteUrl = fileUrl;
    if (!fileUrl.startsWith("http://") && !fileUrl.startsWith("https://")) {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/$/, "");
        const sanitizedPath = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
        absoluteUrl = `${baseUrl}${sanitizedPath}`;
    }

    try {
        // TẠI SAO: Thêm { cache: "no-store" } để bắt buộc Next.js fetch trực tiếp dữ liệu mới nhất từ Cloudinary,
        // tránh trường hợp cơ chế cache của Next.js lưu lại response lỗi (404/403) từ các lượt thử trước đó.
        const response = await fetch(absoluteUrl, {
            cache: "no-store",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        
        // TẠI SAO: Chuyển ArrayBuffer sang Buffer của Node.js giúp Next.js ghi chính xác luồng dữ liệu nhị phân
        // ra HTTP Response mà không bị biến đổi ký tự hoặc chuyển mã UTF-8 gây hỏng cấu trúc tệp PDF (file corrupted).
        const buffer = Buffer.from(arrayBuffer);

        const headers = new Headers();
        // TẠI SAO: Đảm bảo trình duyệt hiểu đây là tệp PDF và tự động kích hoạt hộp thoại tải xuống (attachment)
        // thay vì cố hiển thị nội dung dạng văn bản thô.
        headers.set("Content-Type", "application/pdf");
        headers.set("Content-Disposition", `attachment; filename="${filename}"`);
        headers.set("Cache-Control", "no-store, max-age=0");

        return new NextResponse(buffer, {
            status: 200,
            headers,
        });
    } catch (error: any) {
        // TẠI SAO: Ghi nhận chi tiết lỗi trên máy chủ để thuận tiện cho việc giám sát và debug luồng tải file.
        console.error("Error downloading file:", error);
        
        // TẠI SAO: Khi có lỗi xảy ra, trả về JSON kèm header Content-Type chuẩn là application/json.
        // Tránh trả về JSON nhưng header lại là application/pdf, điều này khiến trình duyệt tải về file .pdf lỗi
        // chứa văn bản JSON bên trong và báo lỗi corrupted khi mở.
        return NextResponse.json(
            { error: "Failed to download file", details: error.message },
            { 
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }
}

