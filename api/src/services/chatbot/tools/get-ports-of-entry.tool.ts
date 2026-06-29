import { FunctionDeclaration, SchemaType } from "@google/generative-ai";
import prisma from "@/lib/prisma";

export const GET_PORTS_OF_ENTRY_NAME = "get_ports_of_entry";

export const getPortsOfEntryDeclaration: FunctionDeclaration = {
    name: GET_PORTS_OF_ENTRY_NAME,
    description: "Lấy danh sách các cửa khẩu (sân bay, đường bộ, đường biển) cho phép sử dụng e-Visa nhập cảnh Việt Nam.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {},
    },
};

export async function executeGetPortsOfEntry() {
    try {
        const ports = await prisma.port.findMany({
            where: { isActive: true }
        });
        
        if (ports.length === 0) {
            return { found: false, message: "Hiện không có dữ liệu cửa khẩu." };
        }
        
        return {
            found: true,
            ports: ports.map(p => ({ name: p.name, code: p.code, type: p.portType }))
        };
    } catch (error: any) {
        return { error: true, message: "Database error" };
    }
}

import { aiToolRegistry } from "./tool-registry";
aiToolRegistry.register(GET_PORTS_OF_ENTRY_NAME, {
    declaration: getPortsOfEntryDeclaration,
    execute: executeGetPortsOfEntry,
    category: "DATA_RETRIEVAL",
});
