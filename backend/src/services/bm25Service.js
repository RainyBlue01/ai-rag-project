
/**
 * BM25 关键词检索服务
 *
 * 功能：
 * 1. 中文和英文基础分词
 * 2. 构建 BM25 索引
 * 3. 计算关键词相关性
 * 4. 返回 Top-K 检索结果
 */

const K1 = 1.5;
const B = 0.75;

/**
 * 基础分词
 *
 * 中文：使用相邻两个汉字组成 Bigram
 * 英文：保留完整单词
 * 数字：保留数字及错误代码
 */
export function tokenize(text) {
  const normalized = String(text || '')
    .toLowerCase();

  const segments = normalized.match(
    /[\u4e00-\u9fff]+|[a-z0-9]+(?:[-_.][a-z0-9]+)*/g
  ) || [];

  const tokens = [];

  for (const segment of segments) {
    // 中文分词
    if (/^[\u4e00-\u9fff]+$/.test(segment)) {
      if (segment.length === 1) {
        tokens.push(segment);
        continue;
      }

      // 生成相邻字符组合
      for (let i = 0; i < segment.length - 1; i++) {
        tokens.push(segment.slice(i, i + 2));
      }
    } else {
      // 英文、数字和错误代码
      tokens.push(segment);
    }
  }

  return tokens;
}

/**
 * 创建 BM25 索引
 *
 * chunks:
 * [
 *   {
 *     chunkId,
 *     content,
 *     metadata
 *   }
 * ]
 */
export function createBM25Index(chunks) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    throw new Error('BM25 索引数据不能为空');
  }

  const documents = chunks.map(chunk => {
    if (!chunk.chunkId || typeof chunk.content !== 'string') {
      throw new Error('Chunk 必须包含 chunkId 和 content');
    }

    const tokens = tokenize(chunk.content);

    const termFrequency = new Map();

    for (const token of tokens) {
      termFrequency.set(
        token,
        (termFrequency.get(token) || 0) + 1
      );
    }

    return {
      chunkId: chunk.chunkId,
      content: chunk.content,
      metadata: chunk.metadata || {},
      tokens,
      termFrequency,
      length: tokens.length
    };
  });

  // 平均文档长度
  const totalLength = documents.reduce(
    (sum, doc) => sum + doc.length,
    0
  );

  const averageDocumentLength =
    totalLength / documents.length;

  // 统计每个关键词出现在哪些文档中
  const documentFrequency = new Map();

  for (const doc of documents) {
    for (const term of doc.termFrequency.keys()) {
      documentFrequency.set(
        term,
        (documentFrequency.get(term) || 0) + 1
      );
    }
  }

  return {
    documents,
    documentFrequency,
    totalDocuments: documents.length,
    averageDocumentLength
  };
}

/**
 * 计算 IDF
 */
function calculateIDF(index, term) {
  const df =
    index.documentFrequency.get(term) || 0;

  const N = index.totalDocuments;

  if (df === 0) return 0;

  return Math.log(
    1 + (N - df + 0.5) / (df + 0.5)
  );
}

/**
 * BM25 搜索
 */
export function searchBM25(
  index,
  query,
  topK = 5
) {
  if (!index || !index.documents) {
    throw new Error('请先构建 BM25 索引');
  }

  if (!Number.isInteger(topK) || topK <= 0) {
    throw new Error('topK 必须是正整数');
  }

  const queryTokens = [...new Set(tokenize(query))];

  if (queryTokens.length === 0) {
    return [];
  }

  const results = index.documents.map(doc => {
    let score = 0;

    for (const term of queryTokens) {
      const tf =
        doc.termFrequency.get(term) || 0;

      if (tf === 0) continue;

      const idf = calculateIDF(index, term);

      const lengthRatio =
        index.averageDocumentLength > 0
          ? doc.length / index.averageDocumentLength
          : 0;

      const denominator =
        tf + K1 * (
          1 - B + B * lengthRatio
        );

      score += idf * (
        tf * (K1 + 1) / denominator
      );
    }

    return {
      chunkId: doc.chunkId,
      score,
      content: doc.content,
      metadata: doc.metadata
    };
  });

  return results
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.chunkId.localeCompare(b.chunkId);
    })
    .slice(0, topK);
}
