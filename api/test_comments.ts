import { listAdminComments } from './src/services/admin/comments.admin.service';

async function test() {
    try {
        const res = await listAdminComments({ page: 1, limit: 10 });
        console.dir(res, { depth: null });
    } catch (e) {
        console.error(e);
    }
}
test();
