"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Pusher from "pusher-js";
import { toast, Toaster } from "react-hot-toast";

export function SystemEventsProvider() {
    const router = useRouter();

    useEffect(() => {
        const key = process.env.NEXT_PUBLIC_SOKETI_KEY;
        if (!key) return;

        const pusher = new Pusher(key, {
            cluster: process.env.NEXT_PUBLIC_SOKETI_CLUSTER ?? "mt1",
            wsHost: process.env.NEXT_PUBLIC_SOKETI_HOST ?? "127.0.0.1",
            wsPort: Number(process.env.NEXT_PUBLIC_SOKETI_PORT ?? "6001"),
            wssPort: Number(process.env.NEXT_PUBLIC_SOKETI_PORT ?? "6001"),
            forceTLS: process.env.NEXT_PUBLIC_SOKETI_FORCE_TLS === "true",
            enabledTransports: ["ws"],
            enableStats: false,
        });

        const channel = pusher.subscribe("system-events");

        channel.bind("cache_revalidated", (data: { tag: string }) => {
            router.refresh();
        });

        channel.bind("application_status_changed", (data: { applicationCode: string, status: string, timestamp: number, buyerName?: string, visaType?: string }) => {
            
            if (data.status === "PAID") {
                const name = data.buyerName || "Khách hàng";
                const type = data.visaType === "VOA" ? "Visa On Arrival" : "e-Visa";
                
                toast.custom((t) => (
                    <div
                        className={`${
                            t.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                        } transition-all duration-300 max-w-sm w-full bg-white dark:bg-zinc-900 shadow-xl rounded-xl pointer-events-auto flex ring-1 ring-black/5 dark:ring-white/10`}
                    >
                        <div className="flex-1 w-0 p-4">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 pt-0.5">
                                    <img
                                        className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800"
                                        src={`https://api.dicebear.com/7.x/notionists/svg?seed=${name}&backgroundColor=transparent`}
                                        alt=""
                                    />
                                </div>
                                <div className="ml-3 flex-1">
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        {name}
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                        Vừa thanh toán thành công {type} 🎉
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ), { position: "bottom-left", duration: 6000 });
            }
        });

        return () => {
            channel.unbind_all();
            pusher.disconnect();
        };
    }, [router]);

    return <Toaster />;
}
