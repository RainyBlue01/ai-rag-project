
/**
 * RAG 检索评估服务
 *
 * 支持：
 * 1. Recall@K
 * 2. Precision@K
 * 3. MRR
 * 4. 多问题综合评估
 */

/**
 * 去重，避免重复 Chunk 影响指标
 */
function uniqueIds(ids) {
  return [...new Set(ids || [])];
}

/**
 * Recall@K
 *
 * 检索到的相关 Chunk 数量
 * / 全部标准相关 Chunk 数量
 */
export function recallAtK(
  retrievedIds,
  relevantIds,
  k
) {
  const relevantSet = new Set(relevantIds);

  if (relevantSet.size === 0) {
    return null;
  }

  const topK = uniqueIds(retrievedIds).slice(0, k);

  const hits = topK.filter(
    id => relevantSet.has(id)
  );

  return hits.length / relevantSet.size;
}

/**
 * Precision@K
 *
 * Top-K 中相关 Chunk 数量 / K
 */
export function precisionAtK(
  retrievedIds,
  relevantIds,
  k
) {
  if (!Number.isInteger(k) || k <= 0) {
    throw new Error('K 必须是大于 0 的整数');
  }

  if (relevantIds.length === 0) {
    return null;
  }

  const relevantSet = new Set(relevantIds);

  const topK = uniqueIds(retrievedIds).slice(0, k);

  const hits = topK.filter(
    id => relevantSet.has(id)
  );

  return hits.length / k;
}

/**
 * MRR
 *
 * 第一个相关 Chunk 的排名倒数
 */
export function reciprocalRank(
  retrievedIds,
  relevantIds
) {
  const relevantSet = new Set(relevantIds);

  if (relevantSet.size === 0) {
    return null;
  }

  const ids = uniqueIds(retrievedIds);

  const index = ids.findIndex(
    id => relevantSet.has(id)
  );

  return index === -1 ? 0 : 1 / (index + 1);
}

/**
 * 综合评估
 */
export function evaluateRetrieval(
  dataset,
  retrievalResults,
  k = 5
) {
  const validDataset = dataset.filter(item =>
    item.labelStatus === 'labeled' &&
    !item.shouldAbstain &&
    item.relevantChunkIds?.length > 0
  );

  const details = validDataset.map(item => {
    const retrievedIds =
      retrievalResults[item.id] || [];

    return {
      id: item.id,

      recall: recallAtK(
        retrievedIds,
        item.relevantChunkIds,
        k
      ),

      precision: precisionAtK(
        retrievedIds,
        item.relevantChunkIds,
        k
      ),

      reciprocalRank: reciprocalRank(
        retrievedIds,
        item.relevantChunkIds
      )
    };
  });

  if (details.length === 0) {
    return {
      sampleCount: 0,
      recallAtK: null,
      precisionAtK: null,
      mrr: null,
      details: []
    };
  }

  const average = key =>
    details.reduce(
      (sum, item) => sum + item[key],
      0
    ) / details.length;

  return {
    sampleCount: details.length,

    recallAtK: average('recall'),

    precisionAtK: average('precision'),

    mrr: average('reciprocalRank'),

    details
  };
}
