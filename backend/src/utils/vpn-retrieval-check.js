
import {
  retrieveKnowledge
} from '../services/retrievalService.js';

const questions = [
  '公司 VPN 如何完成身份认证？',
  'VPN 客户端应该如何安装？',
  'VPN 连接失败应该怎么办？',
  'VPN 认证失败应该检查什么？',
  '公司 VPN 使用什么方式验证身份？',
  'VPN 无法连接时应该联系谁？'
];

async function main() {
  for (const question of questions) {
    console.log('\n========================');
    console.log('问题：', question);

    const results = await retrieveKnowledge(
      question,
      {
        topK: 2,
        department: 'IT'
      }
    );

    for (const item of results) {
      console.log({
        chunkId: item.chunkId,
        distance: item.distance,
        content: item.content
      });
    }
  }
}

main().catch(console.error);
