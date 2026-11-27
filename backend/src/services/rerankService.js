
/**
 * Reranker Service
 *
 * 使用 SiliconFlow 在线 BGE Reranker API
 */

const API_URL = 'https://api.siliconflow.cn/v1/rerank';

const MODEL =
    process.env.SILICONFLOW_RERANK_MODEL ||
    'BAAI/bge-reranker-v2-m3';

/**
 * 对候选 Chunk 重新排序
 */
export async function rerankDocuments(
    query,
    candidates,
    {
        topN = 3
    } = {}
) {
    if (!query || typeof query !== 'string') {
        throw new Error('Query 不能为空');
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
        return [];
    }

    if (!Number.isInteger(topN) || topN < 1) {
        throw new Error('topN 必须是正整数');
    }

    const apiKey = process.env.SILICONFLOW_API_KEY;

    if (!apiKey) {
        throw new Error('缺少 SILICONFLOW_API_KEY');
    }

    // 验证候选 Chunk
    for (const item of candidates) {
        if (
            !item.chunkId ||
            typeof item.content !== 'string' ||
            !item.content.trim()
        ) {
            throw new Error('候选 Chunk 缺少有效 ID 或内容');
        }
    }

    // 调用 Reranker API
    const response = await fetch(API_URL, {
        method: 'POST',

        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },

        body: JSON.stringify({
            model: MODEL,

            query,

            documents: candidates.map(
                item => item.content
            ),

            top_n: Math.min(topN, candidates.length),

            return_documents: false
        }),

        signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `Reranker API 请求失败：${response.status} ${errorText}`
        );
    }

    const data = await response.json();

    if (!Array.isArray(data.results)) {
        throw new Error('Reranker 返回数据格式异常');
    }

    // 使用 API 返回的 index 找回原始 Chunk
    return data.results.map((item, index) => {
        const original = candidates[item.index];

        if (!original) {
            throw new Error(
                `Reranker 返回了无效的候选索引：${item.index}`
            );
        }

        return {
            ...original,

            candidateRank: original.rank,

            rerankRank: index + 1,

            rerankScore: item.relevance_score,

            rank: index + 1
        };
    });
}
