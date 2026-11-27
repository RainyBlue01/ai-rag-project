
import { evaluationDataset } from '../data/evaluation-dataset.js';

import {
  evaluateRetrieval
} from '../services/evaluationService.js';

import {
  retrieveKnowledge
} from '../services/retrievalService.js';

async function main() {
  // 只评估已经完成人工标注的问题
  const dataset = evaluationDataset.filter(item =>
    item.labelStatus === 'labeled' &&
    !item.shouldAbstain &&
    item.relevantChunkIds.length > 0
  );

  const retrievalResults = {};

  console.log(`开始评估 ${dataset.length} 个问题`);

  for (const item of dataset) {
    const results = await retrieveKnowledge(
      item.question,
      {
        topK: 2,
        department: 'IT'
      }
    );

    retrievalResults[item.id] =
      results.map(result => result.chunkId);

    console.log('\n问题：', item.question);

    console.log(
      '实际检索：',
      retrievalResults[item.id]
    );
  }

  const report = evaluateRetrieval(
    dataset,
    retrievalResults,
    2
  );

  console.log('\n========== RAG 评估报告 ==========');

  console.log(
    '测试问题数量：',
    report.sampleCount
  );

  console.log(
    'Recall@2：',
    (report.recallAtK * 100).toFixed(2) + '%'
  );

  console.log(
    'Precision@2：',
    (report.precisionAtK * 100).toFixed(2) + '%'
  );

  console.log(
    'MRR：',
    report.mrr.toFixed(4)
  );

  console.table(report.details);
}

main().catch(error => {
  console.error('评估失败：', error);
  process.exitCode = 1;
});
