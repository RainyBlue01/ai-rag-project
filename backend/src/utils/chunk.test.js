
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import assert from 'node:assert/strict';

import { splitText, buildChunks } from './chunk.js';

const __dirname = path.dirname(
    fileURLToPath(import.meta.url)
);

const filePath = path.join(
    __dirname,
    '../data/vpn-guide.md'
);

const text = fs.readFileSync(filePath, 'utf-8');

// 测试一：基本切分
const chunks = splitText(text, {
    chunkSize: 50,
    overlapSentences: 1
});

console.log('切分结果：');
console.log(chunks);

assert.ok(chunks.length > 0);

// 测试二：长度限制
for (const chunk of chunks) {
    assert.ok(
        Array.from(chunk).length <= 100,
        'Chunk 超过最大长度'
    );
}

// 测试三：空文本
assert.deepEqual(splitText(''), []);

// 测试四：Metadata
const documents = buildChunks({
    text,
    documentId: 'vpn-guide',
    title: 'VPN 使用手册',
    category: 'NETWORK',
    department: 'IT',
    version: 1,
    source: 'vpn-guide.md'
});

assert.ok(documents.length > 0);

for (const chunk of documents) {
    assert.equal(chunk.documentId, 'vpn-guide');
    assert.equal(chunk.metadata.version, 1);
    assert.ok(chunk.chunkId);
    assert.ok(chunk.content);
}

console.log('所有基础测试通过！');
