
import {
  createBM25Index,
  searchBM25,
  tokenize
} from '../services/bm25Service.js';

// 模拟当前知识库中的 Chunk
const chunks = [
  {
    chunkId: 'vpn-guide-v1-001',
    content: `
      VPN 客户端安装说明。
      员工需要下载公司指定的 VPN 客户端。
      安装完成后，打开 VPN 客户端。
      输入公司分配的员工账号和密码，
      然后使用手机验证码完成身份认证。
    `
  },
  {
    chunkId: 'vpn-guide-v1-002',
    content: `
      VPN 无法连接时，请检查本地网络状态。
      如果认证失败，请检查账号密码是否正确。
      如果问题仍然存在，请联系 IT 管理员。
    `
  },
  {
    chunkId: 'vpn-guide-v1-003',
    content: `
      VPN 错误代码 ERR-720。
      请检查 VPN 客户端配置，
      确认服务器地址是否正确。
    `
  }
];

// 1. 测试分词
console.log('===== 分词测试 =====');

console.log(
  tokenize('VPN ERR-720 无法连接')
);

// 2. 构建索引
console.log('\n===== 创建 BM25 索引 =====');

const index = createBM25Index(chunks);

console.log('文档数量:', index.totalDocuments);

console.log(
  '平均文档长度:',
  index.averageDocumentLength
);

// 3. 测试关键词检索
const questions = [
  'VPN 客户端如何安装？',
  'VPN 无法连接怎么办？',
  'ERR-720 怎么解决？',
  '账号密码认证失败怎么办？'
];

for (const question of questions) {
  console.log('\n======================');
  console.log('问题:', question);

  const results = searchBM25(
    index,
    question,
    3
  );

  console.table(
    results.map(item => ({
      chunkId: item.chunkId,
      score: item.score.toFixed(4)
    }))
  );
}
