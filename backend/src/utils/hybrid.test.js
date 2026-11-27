
import {
    retrieveKnowledge,
    retrieveByKeyword,
    retrieveHybridKnowledge
} from '../services/retrievalService.js';

const questions = [
    'VPN 客户端如何安装？',
    'VPN 无法连接怎么办？',
    'VPN 认证失败应该检查什么？',
    '公司 VPN 使用什么方式验证身份？'
];

async function main() {
    console.log('===== Hybrid Search 测试 =====');

    for (const question of questions) {
        console.log('\n================================');
        console.log('问题:', question);

        // 1. Vector Search
        const vectorResults = await retrieveKnowledge(
            question,
            {
                topK: 2,
                department: 'IT'
            }
        );

        // 2. BM25 Search
        const keywordResults = await retrieveByKeyword(
            question,
            {
                topK: 2,
                department: 'IT'
            }
        );

        // 3. Hybrid Search
        const hybridResults = await retrieveHybridKnowledge(
            question,
            {
                topK: 2,
                vectorTopK: 2,
                keywordTopK: 2,
                department: 'IT'
            }
        );

        console.log('\nVector Search:');

        console.table(
            vectorResults.map(item => ({
                chunkId: item.chunkId,
                distance: item.distance
            }))
        );

        console.log('\nBM25 Search:');

        console.table(
            keywordResults.map(item => ({
                chunkId: item.chunkId,
                score: item.score.toFixed(4)
            }))
        );

        console.log('\nHybrid Search:');

        console.table(
            hybridResults.map(item => ({
                rank: item.rank,
                chunkId: item.chunkId,
                rrfScore: item.rrfScore.toFixed(6),
                vectorRank: item.vectorRank,
                keywordRank: item.keywordRank,
                sources: item.sources.join('+')
            }))
        );
    }

    console.log('\nHybrid Search 测试完成！');
}

main().catch(error => {
    console.error('Hybrid Search 测试失败:', error);
    process.exitCode = 1;
});
