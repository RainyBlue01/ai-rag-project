
import {
    embeddingService
} from './embeddingService.js';

import {
    searchVectors,
    getAllChunks,
    getVectorRevision
} from './vectorStore.js';
import {
    reciprocalRankFusion
} from './rrfService.js';
import {
    createBM25Index,
    searchBM25
} from './bm25Service.js';
import {
    rerankDocuments
} from './rerankService.js';
/**
 * BM25 索引缓存
 *
 * key: department
 * value: { revision, index }
 */
const bm25IndexCache = new Map();
/**
 * 基础语义检索
 */
export async function retrieveKnowledge(
    question,
    {
        topK = 3,
        department = 'IT'
    } = {}
) {
    if (
        typeof question !== 'string' ||
        !question.trim()
    ) {
        throw new Error('检索问题不能为空');
    }

    // 1. 用户问题向量化
    const queryVector =
        await embeddingService.embedQuery(
            question.trim()
        );

    // 2. 进行向量搜索
    const results = await searchVectors(
        queryVector,
        {
            topK,
            department
        }
    );

    // 3. 保留距离信息，方便后续评估
    return results.map((item, index) => ({
        rank: index + 1,
        chunkId: item.chunkId,
        content: item.content,
        metadata: item.metadata,
        distance: item.distance
    }));
}

/**
 * 获取 BM25 索引
 *
 * 索引按部门隔离缓存
 * 数据版本变化时自动重建
 */
async function getBM25Index(department) {
    const cacheKey = department || '__all__';

    // 最多重试两次，避免构建期间数据发生变化
    for (let attempt = 0; attempt < 2; attempt++) {
        const revision = getVectorRevision();

        const cached = bm25IndexCache.get(cacheKey);

        // 缓存存在且数据版本一致
        if (
            cached &&
            cached.revision === revision
        ) {
            return cached.index;
        }

        // 获取 Chroma 真实 Chunk
        const chunks = await getAllChunks({
            department
        });

        // 检查读取期间数据是否发生变化
        if (revision !== getVectorRevision()) {
            continue;
        }

        if (chunks.length === 0) {
            bm25IndexCache.delete(cacheKey);
            return null;
        }

        // 构建 BM25 索引
        const index = createBM25Index(chunks);

        // 缓存索引
        bm25IndexCache.set(cacheKey, {
            revision,
            index
        });

        return index;
    }

    throw new Error(
        '知识库在构建 BM25 索引期间发生变化，请重试'
    );
}

/**
 * BM25 关键词检索
 */
export async function retrieveByKeyword(
    question,
    {
        topK = 3,
        department = 'IT'
    } = {}
) {
    if (
        typeof question !== 'string' ||
        !question.trim()
    ) {
        throw new Error('检索问题不能为空');
    }

    // 1. 获取 BM25 索引
    const index = await getBM25Index(department);

    if (!index) {
        return [];
    }

    // 2. 执行关键词检索
    const results = searchBM25(
        index,
        question.trim(),
        topK
    );

    // 3. 统一返回结构
    return results.map((item, index) => ({
        rank: index + 1,
        chunkId: item.chunkId,
        content: item.content,
        metadata: item.metadata,
        score: item.score
    }));
}


/**
 * Hybrid Search
 *
 * Vector Search + BM25 + RRF
 */
export async function retrieveHybridKnowledge(
    question,
    {
        topK = 3,
        vectorTopK = 10,
        keywordTopK = 10,
        department = 'IT',
        rrfK = 60,
        vectorWeight = 1,
        keywordWeight = 1
    } = {}
) {
    if (
        typeof question !== 'string' ||
        !question.trim()
    ) {
        throw new Error('检索问题不能为空');
    }

    // 1. 并行执行两路检索
    const [
        vectorResults,
        keywordResults
    ] = await Promise.all([
        retrieveKnowledge(question, {
            topK: vectorTopK,
            department
        }),

        retrieveByKeyword(question, {
            topK: keywordTopK,
            department
        })
    ]);

    // 2. RRF 排名融合
    const fusedResults = reciprocalRankFusion(
        vectorResults,
        keywordResults,
        {
            topK,
            rrfK,
            vectorWeight,
            keywordWeight
        }
    );

    return fusedResults;
}

/**
 * Hybrid Search + Reranker
 *
 * 先双路召回，再 RRF 融合，最后重排序
 */
export async function retrieveRerankedKnowledge(
    question,
    {
        topK = 3,
        candidateTopK = 10,
        department = 'IT'
    } = {}
) {
    // 1. 获取 Hybrid Search 候选结果
    const candidates = await retrieveHybridKnowledge(
        question,
        {
            topK: candidateTopK,
            vectorTopK: candidateTopK,
            keywordTopK: candidateTopK,
            department
        }
    );

    if (candidates.length === 0) {
        return [];
    }

    // 2. 使用 Reranker 重新排序
    const results = await rerankDocuments(
        question,
        candidates,
        {
            topN: topK
        }
    );

    return results;
}
