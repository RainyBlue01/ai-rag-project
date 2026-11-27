
import fs from 'node:fs/promises';
import path from 'node:path';

import { buildChunks } from '../utils/chunk.js';
import { embeddingService } from './embeddingService.js';

import {
    upsertChunks,
    deleteDocumentVectors,
    getDocumentChunks,
    deleteDocumentVersion
} from './vectorStore.js';

/**
 * 将一份 Markdown 文档写入知识库
 */

/**
 * 将 Markdown 文档写入知识库
 */
export async function ingestMarkdown({
    filePath,
    documentId,
    title,
    category = 'NETWORK',
    department = 'IT',

    // 新增动态切分参数
    chunkSize = 500,
    overlapSentences = 1
}) {
    // 1. 读取 Markdown
    const text = await fs.readFile(
        filePath,
        'utf-8'
    );
// 2. 获取当前文档已有版本
const existingChunks = await getDocumentChunks(documentId);

const currentVersion = existingChunks.reduce(
    (max, chunk) => {
        const version = chunk.metadata?.version;

        return Number.isInteger(version)
            ? Math.max(max, version)
            : max;
    },
    0
);

// 自动生成新版本号
const nextVersion = currentVersion + 1;

console.log(`当前版本：V${currentVersion}`);
console.log(`新版本：V${nextVersion}`);
    // 2. 文档切分
    const chunks = buildChunks({
        text,
        documentId,
        title,
        category,
        department,
       version: nextVersion,
        source: path.basename(filePath),

        // 传递切分配置
        chunkSize,
        overlapSentences
    });

    if (chunks.length === 0) {
        throw new Error('没有可入库的文档内容');
    }

    console.log(`切分完成：${chunks.length} 个 Chunk`);

    // 3. 使用 BGE-M3 生成向量
    const vectors =
        await embeddingService.embedDocuments(
            chunks.map(chunk => chunk.content)
        );

    console.log(`向量生成完成：${vectors.length} 个`);


    // 4. 写入新版本并验证
    let count;
    let writeAttempted = false;

    try {
        // 标记开始写入
        writeAttempted = true;

        count = await upsertChunks(chunks, vectors);

        // 5. 验证新版本是否完整写入
        const savedChunks = await getDocumentChunks(documentId);

        const savedVersionChunks = savedChunks.filter(
            chunk => chunk.metadata?.version === nextVersion
        );

        const savedIds = new Set(
            savedVersionChunks.map(chunk => chunk.chunkId)
        );

        const allSaved =
            savedVersionChunks.length === chunks.length &&
            chunks.every(chunk => savedIds.has(chunk.chunkId));

        if (!allSaved || count !== chunks.length) {
            throw new Error('新版本入库验证失败');
        }

        console.log(`V${nextVersion} 入库验证成功`);

    } catch (error) {

        console.error(
            `V${nextVersion} 入库失败，准备回滚...`,
            error.message
        );

        // 6. 删除新版本可能产生的残留数据
        if (writeAttempted) {
            try {
                await deleteDocumentVersion(
                    documentId,
                    nextVersion
                );

                console.log(
                    `V${nextVersion} 回滚成功`
                );

            } catch (rollbackError) {

                console.error(
                    `V${nextVersion} 回滚失败:`,
                    rollbackError.message
                );

                throw new AggregateError(
                    [error, rollbackError],
                    `V${nextVersion} 入库失败，且回滚失败`
                );
            }
        }

        throw error;
    }


// 6. 清理旧版本
const oldVersions = [
    ...new Set(
        existingChunks
            .map(chunk => chunk.metadata?.version)
            .filter(version =>
                Number.isInteger(version) &&
                version < nextVersion
            )
    )
];

const cleanupErrors = [];
const deletedVersions = [];

for (const oldVersion of oldVersions) {
    try {
        await deleteDocumentVersion(documentId, oldVersion);

        deletedVersions.push(oldVersion);

        console.log(`旧版本 V${oldVersion} 清理成功`);
    } catch (error) {
        cleanupErrors.push({
            version: oldVersion,
            message: error.message
        });

        console.error(
            `旧版本 V${oldVersion} 清理失败:`,
            error.message
        );
    }
}

return {
    documentId,
    version: nextVersion,
    chunkCount: count,
    chunkSize,
    overlapSentences,
    embeddingModel: 'BAAI/bge-m3',
    deletedVersions,
    cleanupErrors
};

}


/**
 * 删除文档对应的向量
 */
export async function removeDocument(documentId) {
    await deleteDocumentVectors(documentId);

    return {
        documentId,
        deleted: true
    };
}
