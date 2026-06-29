import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Apply Online",
    description:
        "Complete your Vietnam visa application in three simple steps. Secure online processing with transparent pricing.",
};

export default function ApplyLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <main className="flex-1 pt-(--header-total-height)">{children}</main>
    );
}
