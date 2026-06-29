/**
 * Generic Pagination Service using Deferred Join for optimal database performance.
 * This pattern counts the total rows and fetches only the IDs using LIMIT/OFFSET,
 * then fetches the full rows by their IDs. This avoids scanning and fetching
 * large amounts of data in the DB just to discard them when offset is large.
 */
export async function paginateDeferredJoin<T extends { id: string | number }>(
    modelDelegate: any,
    args: {
        where?: any;
        orderBy?: any;
        page: number;
        limit: number;
        select?: any;
        include?: any;
    },
): Promise<{ total: number; rows: T[] }> {
    const skip = (args.page - 1) * args.limit;

    // 1. Fetch total count and just the IDs of the required page
    const [total, idsResult] = await Promise.all([
        modelDelegate.count({ where: args.where }),
        modelDelegate.findMany({
            where: args.where,
            orderBy: args.orderBy,
            skip,
            take: args.limit,
            select: { id: true },
        }),
    ]);

    if (total === 0 || idsResult.length === 0) {
        return { total, rows: [] };
    }

    const ids: (string | number)[] = idsResult.map((row: any) => row.id);

    // 2. Fetch full rows matching the retrieved IDs
    const queryArgs: any = {
        where: { id: { in: ids } },
    };

    if (args.select) queryArgs.select = args.select;
    if (args.include) queryArgs.include = args.include;

    const rawRows = await modelDelegate.findMany(queryArgs);

    // 3. Prisma's `in` query does not guarantee the order matches the `ids` array.
    // We map over the `ids` array to ensure the output order perfectly matches the
    // order fetched in the first query (which used orderBy).
    const rowMap = new Map<string | number, T>();
    for (const row of rawRows) {
        rowMap.set(row.id, row as T);
    }

    const sortedRows: T[] = ids.map((id) => rowMap.get(id)!).filter(Boolean);

    return { total, rows: sortedRows };
}
