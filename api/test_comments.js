const { PrismaClient } = require('@prisma/client');

async function test() {
    const prisma = new PrismaClient();
    try {
        const adminService = require('./src/services/admin/comments.admin.service');
        const res = await adminService.listAdminComments({ page: 1, limit: 10 });
        console.dir(res, { depth: null });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
test();
