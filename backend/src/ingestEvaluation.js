import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const documents = [
    { documentId: 'account-policy', title: '员工账号管理制度', category: 'ACCOUNT' },
    { documentId: 'software-install', title: '软件安装与权限申请', category: 'SOFTWARE' },
    { documentId: 'vpn-guide', title: '公司 VPN 使用指南', category: 'NETWORK' },
    { documentId: 'wifi-guide', title: '公司 Wi-Fi 连接指南', category: 'NETWORK' }
];

// vectorStore.js 在模块加载时读取集合名。
process.env.CHROMA_COLLECTION = 'enterprise_it_knowledge_eval';

try {
    const { ingestMarkdown } = await import('./services/documentService.js');
    const { getKnowledgeCollection } = await import('./services/vectorStore.js');
    const reports = [];

    for (const document of documents) {
        const source = `${document.documentId}.md`;
        const filePath = fileURLToPath(new URL(`../../knowledge/${source}`, import.meta.url));
        const { chunkCount } = await ingestMarkdown({ ...document, filePath });
        reports.push({ documentId: document.documentId, source, chunkCount });
    }

    const collection = await getKnowledgeCollection();
    for (const { documentId, source, chunkCount } of reports) {
        const stored = await collection.get({ where: { documentId }, include: ['metadatas'] });
        assert.equal(stored.ids.length, chunkCount, `${documentId} 的片段数量不一致`);
        assert.equal(stored.metadatas.length, chunkCount, `${documentId} 的来源元数据缺失`);
        assert.ok(stored.metadatas.every(metadata => metadata?.source === source),
            `${documentId} 的来源文件名不一致`);
    }

    const total = await collection.count();
    assert.equal(total, reports.reduce((sum, report) => sum + report.chunkCount, 0),
        '评测集合含有额外记录');
    console.table(reports);
    console.log(`集合 ${collection.name} 已验证，共 ${total} 个片段。`);
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
