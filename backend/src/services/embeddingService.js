import 'dotenv/config';

const BASE_URL = (
    process.env.EMBEDDING_BASE_URL ||
    'https://api.siliconflow.cn/v1'
).replace(/\/+$/, '');

const API_KEY = process.env.SILICONFLOW_API_KEY;

const MODEL =
    process.env.EMBEDDING_MODEL || 'BAAI/bge-m3';

const EXPECTED_DIMENSION = Number(
    process.env.EMBEDDING_DIMENSION || 1024
);

const BATCH_SIZE = Number(
    process.env.EMBEDDING_BATCH_SIZE || 16
);

/**
 * 检查配置
 */
function validateConfig() {
    if (!API_KEY) {
        throw new Error(
            '缺少 SILICONFLOW_API_KEY，请检查 .env'
        );
    }

    if (
        !Number.isInteger(EXPECTED_DIMENSION) ||
        EXPECTED_DIMENSION <= 0
    ) {
        throw new Error('Embedding 维度配置错误');
    }

    if (
        !Number.isInteger(BATCH_SIZE) ||
        BATCH_SIZE <= 0 ||
        BATCH_SIZE > 32
    ) {
        throw new Error('Embedding Batch Size 必须在 1～32 之间');
    }
}

/**
 * 调用 SiliconFlow Embedding API
 */
async function requestEmbeddings(texts) {
    validateConfig();

    const response = await fetch(
        `${BASE_URL}/embeddings`,
        {
            method: 'POST',

            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                model: MODEL,
                input: texts,
                encoding_format: 'float'
            })
        }
    );

    const responseText = await response.text();

    let result;

    try {
        result = JSON.parse(responseText);
    } catch {
        throw new Error(
            'Embedding API 返回了无法解析的 JSON'
        );
    }

    if (!response.ok) {
        throw new Error(
            `Embedding API 请求失败 (${response.status}): ${result.message || result.error?.message || '未知错误'
            }`
        );
    }

    if (
        !Array.isArray(result.data) ||
        result.data.length !== texts.length
    ) {
        throw new Error(
            'Embedding 返回数量与输入文本数量不一致'
        );
    }

    // 按照原始输入索引排序
    const sortedData = [...result.data].sort(
        (a, b) => a.index - b.index
    );

    return sortedData.map((item, index) => {
        if (item.index !== index) {
            throw new Error('Embedding 返回索引异常');
        }

        const vector = item.embedding;

        if (
            !Array.isArray(vector) ||
            vector.length !== EXPECTED_DIMENSION
        ) {
            throw new Error(
                `向量维度异常，预期 ${EXPECTED_DIMENSION}，实际 ${vector?.length ?? 0
                }`
            );
        }

        if (
            !vector.every(
                value =>
                    typeof value === 'number' &&
                    Number.isFinite(value)
            )
        ) {
            throw new Error('Embedding 包含非法数值');
        }

        return vector;
    });
}

/**
 * BGE-M3 Embedding Service
 */
export class BgeM3EmbeddingService {

    /**
     * 单条文本向量化
     */
    async embedQuery(text) {
        if (
            typeof text !== 'string' ||
            !text.trim()
        ) {
            throw new Error('Query 不能为空');
        }

        const vectors = await this.embedTexts([
            text.trim()
        ]);

        return vectors[0];
    }

    /**
     * 批量文档向量化
     */
    async embedDocuments(texts) {
        return this.embedTexts(texts);
    }

    /**
     * 通用批量向量化
     */
    async embedTexts(texts) {
        if (!Array.isArray(texts)) {
            throw new Error('texts 必须是数组');
        }

        if (texts.length === 0) {
            return [];
        }

        if (
            texts.some(
                text =>
                    typeof text !== 'string' ||
                    !text.trim()
            )
        ) {
            throw new Error(
                '所有文本都必须是非空字符串'
            );
        }

        const vectors = [];

        // 分批请求，避免一次提交过多数据
        for (
            let i = 0;
            i < texts.length;
            i += BATCH_SIZE
        ) {
            const batch = texts.slice(
                i,
                i + BATCH_SIZE
            );

            const batchVectors =
                await requestEmbeddings(batch);

            vectors.push(...batchVectors);
        }

        return vectors;
    }
}

// 导出统一实例
export const embeddingService =
    new BgeM3EmbeddingService();
