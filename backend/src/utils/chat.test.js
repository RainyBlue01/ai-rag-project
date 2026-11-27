import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { createChatHandler } from '../routes/chat.js';

test('POST /api/chat 的四种响应', async t => {
    const sources = [{ id: 1, source: 'vpn-guide.md', chunkId: 'vpn-guide-v1-001' }];
    const server = createServer(createChatHandler(async question => {
        if (question === '故障') throw new Error('私有上游错误');
        if (question === '审批时长？') return { answer: '资料不足', sources: [] };
        assert.equal(question, '如何认证？');
        return { answer: '使用手机验证码。 [1]', sources };
    }));
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}/api/chat`;

    const cases = [
        ['  如何认证？  ', 200, { status: 'answered', answer: '使用手机验证码。 [1]', sources }],
        ['审批时长？', 200, { status: 'insufficient_context', answer: '资料不足', sources: [] }],
        [' ', 400, { error: '请填写问题' }],
        ['故障', 502, { error: '问答服务暂不可用，请稍后重试' }]
    ];

    for (const [question, status, expected] of cases) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });
        assert.equal(response.status, status, question);
        assert.deepEqual(await response.json(), expected, question);
    }
});
