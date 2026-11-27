
import {
    retrieveByKeyword
} from '../services/retrievalService.js';

import {
    countVectors
} from '../services/vectorStore.js';

const questions = [
    'VPN 客户端如何安装？',
    'VPN 无法连接怎么办？',
    'VPN 认证失败应该检查什么？',
    '公司 VPN 使用什么方式验证身份？'
];

async function main() {
    console.log('===== 真实 Chroma BM25 测试 =====');

    // 1. 检查真实数据数量
    const total = await countVectors();

    console.log('Chroma Chunk 总数量:', total);

    if (total === 0) {
        throw new Error('Chroma 知识库没有数据');
    }

    // 2. 逐个问题执行 BM25
    for (const question of questions) {
        console.log('\n==========================');

        console.log('问题:', question);

        const results = await retrieveByKeyword(
            question,
            {
                topK: 3,
                department: 'IT'
            }
        );

        console.table(
            results.map(item => ({
                rank: item.rank,
                chunkId: item.chunkId,
                score: item.score.toFixed(4),
                source: item.metadata.source
            }))
        );

        if (results.length === 0) {
            console.warn('没有检索到相关内容');
        }
    }

    console.log('\n真实 Chroma BM25 测试完成！');
}

main().catch(error => {
    console.error('测试失败:', error);
    process.exitCode = 1;
});
