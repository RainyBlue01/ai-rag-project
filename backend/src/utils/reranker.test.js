
import {
    retrieveHybridKnowledge,
    retrieveRerankedKnowledge
} from '../services/retrievalService.js';

const questions = [
    'VPN 客户端如何安装？',
    'VPN 无法连接怎么办？',
    'VPN 认证失败应该检查什么？',
    '公司 VPN 使用什么方式验证身份？'
];

async function main() {
    console.log('===== Reranker 测试 =====');

    for (const question of questions) {
        console.log('\n========================');
        console.log('问题:', question);

        // 获取 RRF 候选结果
        const candidates = await retrieveHybridKnowledge(
            question,
            {
                topK: 10,
                vectorTopK: 10,
                keywordTopK: 10,
                department: 'IT'
            }
        );

        console.log('\nRRF 候选排名:');

        console.table(
            candidates.map(item => ({
                chunkId: item.chunkId,
                rrfScore: item.rrfScore
            }))
        );

        // 获取 Reranker 最终排名
        const results = await retrieveRerankedKnowledge(
            question,
            {
                topK: 2,
                candidateTopK: 10,
                department: 'IT'
            }
        );

        console.log('\nReranker 最终排名:');

        console.table(
            results.map(item => ({
                chunkId: item.chunkId,
                candidateRank: item.candidateRank,
                rerankRank: item.rerankRank,
                rerankScore: item.rerankScore
            }))
        );
    }

    console.log('\nReranker 测试完成！');
}

main().catch(error => {
    console.error('Reranker 测试失败:', error);
    process.exitCode = 1;
});
