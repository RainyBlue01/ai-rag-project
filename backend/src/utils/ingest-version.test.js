
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { ingestMarkdown } from '../services/documentService.js';

import {
    getDocumentChunks,
    upsertChunks,
    deleteDocumentVectors
} from '../services/vectorStore.js';

async function main() {
    console.log('\n===== 自动版本升级集成测试 =====\n');

    const suffix = randomUUID();

    const documentId = `ingest-version-${suffix}`;
    const otherDocumentId = `unrelated-${suffix}`;

    const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), 'rag-version-test-')
    );

    const filePath = path.join(tempDir, 'test.md');

    const cleanupErrors = [];
    let testError = null;

    try {
        // 1. 创建一个无关文档，验证不会被误删除
        await upsertChunks(
            [{
                chunkId: `${otherDocumentId}-v1-001`,
                documentId: otherDocumentId,
                content: 'UNRELATED_DOCUMENT_MARKER',
                metadata: {
                    title: '无关测试文档',
                    source: 'other.md',
                    category: 'TEST',
                    department: 'IT',
                    version: 1,
                    chunkIndex: 0
                }
            }],
            [Array(1024).fill(0.01)]
        );

        console.log('1. 无关文档准备完成');

        // 2. 第一次导入，预期 V1
        await fs.writeFile(
            filePath,
            `# 自动版本测试

这是第一版测试文档。

V1_CONTENT_MARKER。
用于验证自动版本管理功能。
`,
            'utf-8'
        );

        console.log('\n2. 第一次导入...');

        const first = await ingestMarkdown({
            filePath,
            documentId,
            title: '自动版本测试',
            category: 'TEST',
            department: 'IT',
            chunkSize: 120,
            overlapSentences: 1
        });

        assert.equal(first.version, 1);

        let chunks = await getDocumentChunks(documentId);

        assert.ok(chunks.length > 0);
        assert.equal(chunks.length, first.chunkCount);

        console.log('V1 导入成功');
        console.log('V1 Chunk 数量:', chunks.length);

        // 3. 修改文档，再次导入，预期 V2
        await fs.writeFile(
            filePath,
            `# 自动版本测试

这是第二版测试文档。

V2_CONTENT_MARKER。
本次内容已经更新。
用于验证旧版本自动清理。
`,
            'utf-8'
        );

        console.log('\n3. 第二次导入...');

        const second = await ingestMarkdown({
            filePath,
            documentId,
            title: '自动版本测试',
            category: 'TEST',
            department: 'IT',
            chunkSize: 120,
            overlapSentences: 1
        });

        assert.equal(second.version, 2);

        // 4. 验证 V2 存在，V1 已清理
        chunks = await getDocumentChunks(documentId);

        assert.ok(chunks.length > 0);
        assert.equal(chunks.length, second.chunkCount);

        assert.ok(
            chunks.every(chunk => chunk.metadata.version === 2),
            '发现旧版本残留'
        );

        assert.ok(
            chunks.some(chunk =>
                chunk.content.includes('V2_CONTENT_MARKER')
            ),
            'V2 内容不存在'
        );

        console.log('V2 自动升级成功');
        console.log('V2 Chunk 数量:', chunks.length);
        console.log('V1 已清理');

        // 5. 验证其他文档没有受到影响
        const otherChunks = await getDocumentChunks(
            otherDocumentId
        );

        assert.equal(otherChunks.length, 1);

        assert.equal(
            otherChunks[0].content,
            'UNRELATED_DOCUMENT_MARKER'
        );

        console.log('\n5. 无关文档完整性验证通过');

        console.log('\n===== 自动版本升级测试全部通过！ =====');

    } catch (error) {
        testError = error;

    } finally {
        // 6. 清理测试数据
        for (const id of [documentId, otherDocumentId]) {
            try {
                await deleteDocumentVectors(id);
            } catch (error) {
                cleanupErrors.push(error);
            }
        }

        try {
            await fs.rm(tempDir, {
                recursive: true,
                force: true
            });
        } catch (error) {
            cleanupErrors.push(error);
        }

        console.log('\n测试数据清理完成');
    }

    if (testError) {
        throw testError;
    }

    if (cleanupErrors.length > 0) {
        throw new AggregateError(
            cleanupErrors,
            '测试数据清理失败'
        );
    }
}

main().catch(error => {
    console.error('\n自动版本升级测试失败：', error);
    process.exitCode = 1;
});
