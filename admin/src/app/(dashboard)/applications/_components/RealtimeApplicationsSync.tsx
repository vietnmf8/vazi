"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPusherClient } from "@/lib/soketi";

export function RealtimeApplicationsSync() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const pusher = getPusherClient();
        if (!pusher) return;

        const channel = pusher.subscribe("admin-notifications");
        
        const handleUpdate = () => {
            queryClient.invalidateQueries({ queryKey: ["applications"] });
        };

        channel.bind("applications_updated", handleUpdate);

        return () => {
            channel.unbind("applications_updated", handleUpdate);
        };
    }, [queryClient]);

    return null;
}
