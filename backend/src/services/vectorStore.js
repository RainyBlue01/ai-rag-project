
import 'dotenv/config';
import { ChromaClient } from 'chromadb-client';

const client = new ChromaClient({
    path: process.env.CHROMA_URL ||
        'http://localhost:8000'
});

const COLLECTION_NAME =
    process.env.CHROMA_COLLECTION ||
    'enterprise_it_knowledge';

let collectionPromise;
// 向量数据版本号，用于判断 BM25 索引是否过期
let vectorRevision = 0;

export function getVectorRevision() {
    return vectorRevision;
}
/**
 * 获取或创建知识库集合
 */
export function getKnowledgeCollection() {
    if (!collectionPromise) {
        collectionPromise = client.getOrCreateCollection({
            name: COLLECTION_NAME,
            metadata: {
                embeddingModel: 'BAAI/bge-m3',
                dimension: 1024
            }
        }).catch(error => {
            collectionPromise = null;
            throw error;
        });
    }

    return collectionPromise;
}

/**
 * 获取 Chroma 中的全部知识片段
 *
 * 支持：
 * 1. 分页读取
 * 2. 按部门过滤
 * 3. 获取真实 Chunk ID、内容和 Metadata
 */
export async function getAllChunks({
    department,
    pageSize = 100
} = {}) {
    if (
        !Number.isInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 1000
    ) {
        throw new Error('pageSize 必须在 1～1000 之间');
    }

    const collection = await getKnowledgeCollection();

    const allChunks = [];

    let offset = 0;

    while (true) {
        const params = {
            limit: pageSize,
            offset,
            include: ['documents', 'metadatas']
        };

        // 按部门过滤
        if (department) {
            params.where = {
                department
            };
        }

        const result = await collection.get(params);

        const ids = result.ids || [];
        const documents = result.documents || [];
        const metadatas = result.metadatas || [];

        if (ids.length === 0) {
            break;
        }

        for (let i = 0; i < ids.length; i++) {
            const content = documents[i];

            if (typeof content !== 'string') {
                continue;
            }

            allChunks.push({
                chunkId: ids[i],
                content,
                metadata: metadatas[i] || {}
            });
        }

        offset += ids.length;

        if (ids.length < pageSize) {
            break;
        }
    }

    return allChunks;
}

/**
 * 根据 Document ID 获取该文档的全部 Chunk
 *
 * 支持：
 * 1. 按 Document ID 过滤
 * 2. 分页读取
 * 3. 返回 Chunk ID、内容和 Metadata
 */
export async function getDocumentChunks(
    documentId,
    { pageSize = 100 } = {}
) {
    if (
        typeof documentId !== 'string' ||
        !documentId.trim()
    ) {
        throw new Error('documentId 不能为空');
    }

    if (
        !Number.isInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 1000
    ) {
        throw new Error('pageSize 必须在 1～1000 之间');
    }

    const collection = await getKnowledgeCollection();

    const chunks = [];
    let offset = 0;

    while (true) {
        const result = await collection.get({
            limit: pageSize,
            offset,
            where: {
                documentId
            },
            include: ['documents', 'metadatas']
        });

        const ids = result.ids || [];
        const documents = result.documents || [];
        const metadatas = result.metadatas || [];

        if (ids.length === 0) {
            break;
        }

    for (let i = 0; i < ids.length; i++) {
    const content = documents[i];

    if (typeof content !== 'string') {
        continue;
    }

    chunks.push({
        chunkId: ids[i],
        content,
        metadata: metadatas[i] || {}
    });
}

        offset += ids.length;

        if (ids.length < pageSize) {
            break;
        }
    }

    return chunks;
}

/**
 * 保存或更新知识片段
 */
export async function upsertChunks(
    chunks,
    vectors
) {
    if (chunks.length !== vectors.length) {
        throw new Error('Chunk 数量与向量数量不一致');
    }

    if (chunks.length === 0) return 0;

    const collection = await getKnowledgeCollection();

    await collection.upsert({
        ids: chunks.map(chunk => chunk.chunkId),

        embeddings: vectors,

        documents: chunks.map(chunk => chunk.content),

        metadatas: chunks.map(chunk => ({
            documentId: chunk.documentId,
            title: chunk.metadata.title ?? '',
            source: chunk.metadata.source ?? '',
            category: chunk.metadata.category ?? 'OTHER',
            department: chunk.metadata.department ?? 'IT',
            version: chunk.metadata.version,
            chunkIndex: chunk.metadata.chunkIndex
        }))
    });
vectorRevision += 1;
    return chunks.length;
}

/**
 * 根据查询向量搜索 Top-K
 */
export async function searchVectors(
    vector,
    {
        topK = 3,
        department
    } = {}
) {
    if (
        !Array.isArray(vector) ||
        vector.length !== 1024
    ) {
        throw new Error('Query 向量维度错误');
    }

    if (
        !Number.isInteger(topK) ||
        topK < 1 ||
        topK > 20
    ) {
        throw new Error('topK 必须在 1～20 之间');
    }

    const collection = await getKnowledgeCollection();

    const count = await collection.count();
    if (count === 0) return [];

    const params = {
        queryEmbeddings: [vector],
        nResults: Math.min(topK, count),
        include: ['documents', 'metadatas', 'distances']
    };

    if (department) {
        params.where = { department };
    }

    const result = await collection.query(params);

    const ids = result.ids?.[0] ?? [];
    const documents = result.documents?.[0] ?? [];
    const metadatas = result.metadatas?.[0] ?? [];
    const distances = result.distances?.[0] ?? [];

    return ids.map((id, index) => ({
        chunkId: id,
        content: documents[index],
        metadata: metadatas[index],
        distance: distances[index]
    }));
}

/**
 * 按 Document ID 删除全部 Chunk
 */
export async function deleteDocumentVectors(
    documentId
) {
    if (!documentId) {
        throw new Error('documentId 不能为空');
    }

    const collection = await getKnowledgeCollection();

    await collection.delete({
        where: { documentId }
    });
    // 文档删除后，BM25 索引需要刷新
vectorRevision += 1;
}

/**
 * 删除指定文档的指定版本
 *
 * 例如：
 * deleteDocumentVersion('vpn-guide', 1)
 *
 * 只删除 vpn-guide 的 version 1
 * 不影响其他文档和其他版本
 */
export async function deleteDocumentVersion(
    documentId,
    version
) {
    if (
        typeof documentId !== 'string' ||
        !documentId.trim()
    ) {
        throw new Error('documentId 不能为空');
    }

    if (
        !Number.isInteger(version) ||
        version < 1
    ) {
        throw new Error('version 必须是大于 0 的整数');
    }

    const collection = await getKnowledgeCollection();

    await collection.delete({
        where: {
            $and: [
                {
                    documentId: {
                        $eq: documentId
                    }
                },
                {
                    version: {
                        $eq: version
                    }
                }
            ]
        }
    });

    // 数据发生变化，通知 BM25 索引刷新
    vectorRevision += 1;

    return {
        documentId,
        version,
        deleted: true
    };
}

/**
 * 当前集合记录数量
 */
export async function countVectors() {
    const collection = await getKnowledgeCollection();
    return collection.count();
}
