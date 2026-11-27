
/**
 * RRF 倒数排名融合服务
 *
 * 将多个检索通道的排名融合为统一结果。
 *
 * 支持：
 * 1. Vector Search
 * 2. BM25 Search
 * 3. 可配置权重
 * 4. 按 Chunk ID 去重
 */

/**
 * Reciprocal Rank Fusion
 */
export function reciprocalRankFusion(
    vectorResults,
    keywordResults,
    {
        topK = 5,
        rrfK = 60,
        vectorWeight = 1,
        keywordWeight = 1
    } = {}
) {
    if (!Number.isInteger(topK) || topK < 1) {
        throw new Error('topK 必须是正整数');
    }

    if (!Number.isInteger(rrfK) || rrfK < 0) {
        throw new Error('rrfK 必须是非负整数');
    }

    if (
        !Number.isFinite(vectorWeight) ||
        vectorWeight < 0 ||
        !Number.isFinite(keywordWeight) ||
        keywordWeight < 0
    ) {
        throw new Error('检索权重必须是非负数');
    }

    const fusedMap = new Map();

    /**
     * 将单路检索结果加入融合集合
     */
    function mergeResults(results, source, weight) {
        results.forEach((item, index) => {
            if (!item.chunkId) return;

            let current = fusedMap.get(item.chunkId);

            if (!current) {
                current = {
                    chunkId: item.chunkId,
                    content: item.content,
                    metadata: item.metadata || {},

                    rrfScore: 0,

                    vectorRank: null,
                    keywordRank: null,

                    distance: null,
                    bm25Score: null,

                    sources: []
                };

                fusedMap.set(item.chunkId, current);
            }

            const rank = index + 1;

            // RRF 核心计算
            current.rrfScore +=
                weight / (rrfK + rank);

            // 保存原始检索信息
            if (source === 'vector') {
                current.vectorRank = rank;
                current.distance = item.distance;
            }

            if (source === 'keyword') {
                current.keywordRank = rank;
                current.bm25Score = item.score;
            }

            if (!current.content && item.content) {
                current.content = item.content;
            }

            if (!current.sources.includes(source)) {
                current.sources.push(source);
            }
        });
    }

    // 合并两路检索结果
    mergeResults(
        vectorResults,
        'vector',
        vectorWeight
    );

    mergeResults(
        keywordResults,
        'keyword',
        keywordWeight
    );

    // 按 RRF 分数排序
    const results = [...fusedMap.values()]
        .sort((a, b) => {
            if (b.rrfScore !== a.rrfScore) {
                return b.rrfScore - a.rrfScore;
            }

            return a.chunkId.localeCompare(b.chunkId);
        })
        .slice(0, topK);

    return results.map((item, index) => ({
        ...item,
        rank: index + 1
    }));
}
