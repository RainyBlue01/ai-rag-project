
import assert from 'node:assert/strict';

import {
    embeddingService
} from '../services/embeddingService.js';

/**
 * 计算余弦相似度
 */
function cosineSimilarity(a, b) {
    const dot = a.reduce(
        (sum, value, index) =>
            sum + value * b[index],
        0
    );

    const normA = Math.sqrt(
        a.reduce((sum, value) => sum + value ** 2, 0)
    );

    const normB = Math.sqrt(
        b.reduce((sum, value) => sum + value ** 2, 0)
    );

    if (normA === 0 || normB === 0) {
        throw new Error('不能计算零向量相似度');
    }

    return dot / (normA * normB);
}

async function main() {
    const documents = [
        'Windows 电脑无法连接无线网络。',
        '我的电脑连不上公司的 Wi-Fi。',
        '如何申请公司 VPN 账号？'
    ];

    console.log('开始批量生成文档向量...');

    const vectors =
        await embeddingService.embedDocuments(
            documents
        );

    assert.equal(vectors.length, 3);

    console.log('文档向量生成成功！');

    vectors.forEach((vector, index) => {
        console.log(
            `文档 ${index + 1}：维度=${vector.length}`
        );

        assert.equal(vector.length, 1024);
    });

    console.log('\n开始生成 Query 向量...');

    const queryVector =
        await embeddingService.embedQuery(
            '电脑无法连接公司 Wi-Fi 怎么办？'
        );

    assert.equal(queryVector.length, 1024);

    console.log('Query 向量生成成功！');

    // 计算语义相似度
    const similarityAB =
        cosineSimilarity(vectors[0], vectors[1]);

    const similarityAC =
        cosineSimilarity(vectors[0], vectors[2]);

    const similarityQueryA =
        cosineSimilarity(queryVector, vectors[0]);

    console.log('\n相似度测试结果：');

    console.log('A 与 B：', similarityAB.toFixed(4));
    console.log('A 与 C：', similarityAC.toFixed(4));

    console.log(
        'Query 与 A：',
        similarityQueryA.toFixed(4)
    );

    console.log('\nEmbedding 基础测试全部通过！');
}

main().catch(error => {
    console.error('测试失败：', error.message);
    process.exitCode = 1;
});
