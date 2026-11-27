
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ingestMarkdown } from '../services/documentService.js';
import {
  countVectors,
  getAllChunks
} from '../services/vectorStore.js';

// 当前脚本所在目录
const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

// 项目根目录下的 knowledge
const knowledgeDir = path.resolve(
  __dirname,
  '../../../knowledge'
);

// 文档配置
// chunkSize 保持 120，与现有 vector.test.js 一致
const documents = [
  {
    fileName: 'account-policy.md',
    documentId: 'account-policy',
    title: '账号权限管理规范',
    category: 'ACCOUNT',
    department: 'IT',
    version: 1
  },
  {
    fileName: 'software-install.md',
    documentId: 'software-install',
    title: '软件安装规范',
    category: 'SOFTWARE',
    department: 'IT',
    version: 1
  },
  {
    fileName: 'vpn-guide.md',
    documentId: 'vpn-guide',
    title: 'VPN 使用手册',
    category: 'NETWORK',
    department: 'IT',
    version: 1
  },
  {
    fileName: 'wifi-guide.md',
    documentId: 'wifi-guide',
    title: 'Wi-Fi 故障指南',
    category: 'NETWORK',
    department: 'IT',
    version: 1
  }
];

async function main() {
  console.log('\n===== 企业知识库批量入库 =====\n');

  // 1. 检查知识库目录
  await fs.access(knowledgeDir);

  console.log('知识库目录：', knowledgeDir);
  console.log('待处理文档数量：', documents.length);

  const results = [];
  const failures = [];

  // 2. 逐个处理文档
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];

    const filePath = path.join(
      knowledgeDir,
      doc.fileName
    );

    console.log(
      `\n[${i + 1}/${documents.length}] ${doc.fileName}`
    );

    try {
      // 检查文件是否存在
      await fs.access(filePath);

      // 调用已有文档入库 Service
      const result = await ingestMarkdown({
        filePath,
        documentId: doc.documentId,
        title: doc.title,
        category: doc.category,
        department: doc.department,
        version: doc.version,

        chunkSize: 120,
        overlapSentences: 1
      });

      console.log('入库成功！');
      console.log('Document ID:', result.documentId);
      console.log('Chunk 数量:', result.chunkCount);

      results.push({
        documentId: doc.documentId,
        fileName: doc.fileName,
        chunkCount: result.chunkCount
      });

    } catch (error) {
      console.error('入库失败：', error.message);

      failures.push({
        fileName: doc.fileName,
        error: error.message
      });
    }
  }

  // 3. 获取 Chroma 实际数据
  console.log('\n===== 验证 Chroma 数据 =====');

  const totalCount = await countVectors();

  const allChunks = await getAllChunks({
    pageSize: 1000
  });

  console.log('Chroma 实际向量总数:', totalCount);

  // 4. 按文档统计 Chunk
  console.log('\n===== 文档入库统计 =====');

  for (const doc of documents) {
    const docChunks = allChunks.filter(
      item =>
        item.metadata?.documentId === doc.documentId
    );

    console.log(
      `${doc.fileName}: ${docChunks.length} 个 Chunk`
    );
  }

  // 5. 检查重复 Chunk ID
  const ids = allChunks.map(item => item.chunkId);
  const uniqueIds = new Set(ids);

  const duplicateCount = ids.length - uniqueIds.size;

  console.log('\n===== 数据完整性检查 =====');

  console.log('实际 Chunk 数量:', ids.length);
  console.log('唯一 Chunk ID 数量:', uniqueIds.size);
  console.log('重复 Chunk ID 数量:', duplicateCount);

  // 6. 输出最终报告
  console.log('\n===== 批量入库报告 =====');

  console.log('计划文档数:', documents.length);
  console.log('本次成功数:', results.length);
  console.log('本次失败数:', failures.length);
  console.log('Chroma 当前总 Chunk:', totalCount);

  if (duplicateCount > 0) {
    console.error('发现重复 Chunk ID！');
  }

  if (failures.length > 0) {
    console.error('\n失败文档：', failures);
  }

  if (results.length === documents.length &&
      duplicateCount === 0) {
    console.log('\n批量入库任务完成！');
  } else {
    console.log('\n批量入库存在异常，请检查报告。');
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error('\n批量入库程序异常：', error);
  process.exitCode = 1;
});
