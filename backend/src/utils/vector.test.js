
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import {
    ingestMarkdown,
    removeDocument
} from '../services/documentService.js';

import {
    retrieveKnowledge
} from '../services/retrievalService.js';

import {
    countVectors
} from '../services/vectorStore.js';

const dirname = path.dirname(
    fileURLToPath(import.meta.url)
);

const filePath = path.join(
    dirname,
    '../data/vpn-guide.md'
);

async function main() {
    console.log('=== Step 3：Chroma 测试 ===');

    // 1. 清理这份测试文档的旧数据
    // 仅清理 vpn-guide，不清空整个 Collection
    await removeDocument('vpn-guide');

    // 2. 将 Markdown 文档入库
    console.log('\n1. 开始文档入库...');

    const result = await ingestMarkdown({
    filePath,
    documentId: 'vpn-guide',
    title: 'VPN 使用手册',
    category: 'NETWORK',
    department: 'IT',
    version: 1,

    chunkSize: 120,
    overlapSentences: 1
});

    console.log('入库结果：', result);

    assert.ok(result.chunkCount > 0);

    // 3. 查询总数
    const before = await countVectors();

    console.log('当前向量总数：', before);

    // 4. 测试 Top-K
    console.log('\n2. 开始语义检索...');

    const results = await retrieveKnowledge(
        '公司 VPN 如何配置账号并完成认证？',
        {
            topK: 3,
            department: 'IT'
        }
    );

    assert.ok(results.length > 0);

    for (const item of results) {
        console.log('\n-------------------');
        console.log('排名：', item.rank);
        console.log('Chunk ID：', item.chunkId);
        console.log('距离：', item.distance);
        console.log('来源：', item.metadata?.source);
        console.log('内容：', item.content);
    }

    // 5. 重复入库测试
    console.log('\n3. 测试重复入库...');

    await ingestMarkdown({
        filePath,
        documentId: 'vpn-guide',
        title: 'VPN 使用手册',
        category: 'NETWORK',
        department: 'IT',
        version: 1
    });

    const after = await countVectors();

    assert.equal(
        before,
        after,
        '重复入库不应该增加相同 Chunk ID 的数量'
    );

    console.log('重复入库测试通过！');

    console.log('\n所有基础测试通过！');
}

main().catch(error => {
    console.error('测试失败：', error);
    process.exitCode = 1;
});
