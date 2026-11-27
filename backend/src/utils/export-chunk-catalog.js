
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getKnowledgeCollection
} from '../services/vectorStore.js';

const dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

async function main() {
  console.log('开始读取 Chroma 知识库...');

  const collection = await getKnowledgeCollection();

  // 获取当前集合总记录数
  const total = await collection.count();

  console.log(`知识库共有 ${total} 个 Chunk`);

  const pageSize = 100;
  const allChunks = [];

  // 分页读取，避免一次获取大量数据
  for (
    let offset = 0;
    offset < total;
    offset += pageSize
  ) {
    const result = await collection.get({
      limit: pageSize,
      offset,
      include: ['documents', 'metadatas']
    });

    const ids = result.ids || [];
    const documents = result.documents || [];
    const metadatas = result.metadatas || [];

    for (let i = 0; i < ids.length; i++) {
      const item = {
        chunkId: ids[i],
        content: documents[i] || '',
        metadata: metadatas[i] || {}
      };

      allChunks.push(item);

      console.log('\n--------------------------');
      console.log('Chunk ID:', item.chunkId);
      console.log('Document ID:', item.metadata.documentId);
      console.log('Version:', item.metadata.version);
      console.log('Source:', item.metadata.source);
      console.log('Content:', item.content);
    }

    console.log(
      `读取进度：${allChunks.length}/${total}`
    );

    if (ids.length === 0) break;
  }

  // 导出 JSON 文件
  const outputPath = path.join(
    dirname,
    '../data/chunk-catalog.json'
  );

  await fs.writeFile(
    outputPath,
    JSON.stringify(allChunks, null, 2),
    'utf-8'
  );

  console.log('\nChunk 导出完成！');
  console.log('总数：', allChunks.length);
  console.log('文件：', outputPath);
}

main().catch(error => {
  console.error('导出失败：', error);
  process.exitCode = 1;
});
