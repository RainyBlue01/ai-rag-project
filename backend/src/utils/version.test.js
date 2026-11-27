
import assert from 'node:assert/strict';

import {
    upsertChunks,
    getDocumentChunks,
    deleteDocumentVersion,
    deleteDocumentVectors
} from '../services/vectorStore.js';

async function main() {
    console.log('===== 文档版本管理专项测试 =====');

    const documentId = `version-test-${Date.now()}`;
    const otherDocumentId = `${documentId}-other`;

    try {
        // 1. 准备测试数据
        const chunks = [
            {
                chunkId: `${documentId}-v1-001`,
                documentId,
                content: '这是文档 V1 第一段',
                metadata: {
                    title: '版本测试',
                    source: 'version-test.md',
                    category: 'TEST',
                    department: 'IT',
                    version: 1,
                    chunkIndex: 0
                }
            },
            {
                chunkId: `${documentId}-v1-002`,
                documentId,
                content: '这是文档 V1 第二段',
                metadata: {
                    title: '版本测试',
                    source: 'version-test.md',
                    category: 'TEST',
                    department: 'IT',
                    version: 1,
                    chunkIndex: 1
                }
            },
            {
                chunkId: `${documentId}-v2-001`,
                documentId,
                content: '这是文档 V2 第一段',
                metadata: {
                    title: '版本测试',
                    source: 'version-test.md',
                    category: 'TEST',
                    department: 'IT',
                    version: 2,
                    chunkIndex: 0
                }
            },
            {
                chunkId: `${otherDocumentId}-v1-001`,
                documentId: otherDocumentId,
                content: '这是其他文档',
                metadata: {
                    title: '其他文档',
                    source: 'other.md',
                    category: 'TEST',
                    department: 'IT',
                    version: 1,
                    chunkIndex: 0
                }
            }
        ];

        const vectors = chunks.map(() =>
            Array(1024).fill(0.01)
        );

        // 2. 写入测试数据
        console.log('\n1. 测试数据入库...');

        await upsertChunks(chunks, vectors);

        console.log('测试数据入库成功');

        // 3. 测试按文档查询
        console.log('\n2. 测试 getDocumentChunks...');

        const results = await getDocumentChunks(
            documentId,
            { pageSize: 2 }
        );

        assert.equal(results.length, 3);

        console.log('查询数量:', results.length);
        console.log('分页查询通过');

        // 4. 检查版本分布
        const v1 = results.filter(
            item => item.metadata.version === 1
        );

        const v2 = results.filter(
            item => item.metadata.version === 2
        );

        assert.equal(v1.length, 2);
        assert.equal(v2.length, 1);

        console.log('V1 Chunk 数量:', v1.length);
        console.log('V2 Chunk 数量:', v2.length);

        // 5. 测试不存在的文档
        const empty = await getDocumentChunks(
            `${documentId}-missing`
        );

        assert.equal(empty.length, 0);

        console.log('空结果测试通过');

        // 6. 测试删除指定版本
        console.log('\n3. 测试 deleteDocumentVersion...');

        await deleteDocumentVersion(documentId, 1);

        const remaining = await getDocumentChunks(documentId);

        assert.equal(remaining.length, 1);
        assert.equal(remaining[0].metadata.version, 2);

        console.log('V1 删除成功');
        console.log('V2 保留成功');

        // 7. 检查其他文档
        const other = await getDocumentChunks(otherDocumentId);

        assert.equal(other.length, 1);

        console.log('其他文档未受影响');

        console.log('\n===== 专项测试全部通过！ =====');

    } finally {
        // 8. 清理测试数据
        await deleteDocumentVectors(documentId);
        await deleteDocumentVectors(otherDocumentId);

        console.log('测试数据清理完成');
    }
}

main().catch(error => {
    console.error('测试失败:', error);
    process.exitCode = 1;
});
