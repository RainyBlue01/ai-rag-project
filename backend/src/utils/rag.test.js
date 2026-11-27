import assert from 'node:assert/strict';
import test from 'node:test';
import { generateAnswer } from '../services/llmService.js';
import { createRagService } from '../services/ragService.js';

const vpnChunk = {
    chunkId: 'vpn-guide-v1-001',
    content: '输入公司分配的员工账号和密码，然后使用手机验证码完成身份认证。',
    metadata: { source: 'vpn-guide.md' }
};

test('VPN 问答调用 DeepSeek 并用检索结果生成引用', async t => {
    const previousKey = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = 'test-key';
    t.after(() => {
        if (previousKey === undefined) delete process.env.DEEPSEEK_API_KEY;
        else process.env.DEEPSEEK_API_KEY = previousKey;
    });

    t.mock.method(globalThis, 'fetch', async (url, request) => {
        assert.ok(url.endsWith('/chat/completions'));
        assert.equal(request.headers.Authorization, 'Bearer test-key');
        const body = JSON.parse(request.body);
        assert.equal(body.response_format.type, 'json_object');
        assert.deepEqual(JSON.parse(body.messages[1].content), {
            question: '公司 VPN 如何完成身份认证？',
            chunks: [{ id: 1, content: vpnChunk.content }]
        });
        return Response.json({
            choices: [{
                finish_reason: 'stop',
                message: { content: JSON.stringify({
                    answer: vpnChunk.content,
                    citations: [1, 1]
                }) }
            }]
        });
    });

    const ask = createRagService({ retrieve: async () => [vpnChunk], generate: generateAnswer });
    assert.deepEqual(await ask('公司 VPN 如何完成身份认证？'), {
        answer: vpnChunk.content + ' [1]',
        sources: [{ id: 1, chunkId: vpnChunk.chunkId, source: 'vpn-guide.md' }]
    });
});

test('资料不足、虚构链接编号和空检索都不会返回来源', async () => {
    const fallback = { answer: '现有知识库资料不足，无法回答这个问题。', sources: [] };
    const question = '公司 VPN 账号审批要几个工作日？';
    for (const result of [
        { answer: '', citations: [] },
        { answer: '三个工作日', citations: [2] }
    ]) {
        const ask = createRagService({
            retrieve: async () => [vpnChunk],
            generate: async () => result
        });
        assert.deepEqual(await ask(question), fallback);
    }

    const ask = createRagService({
        retrieve: async () => [],
        generate: async () => assert.fail('无片段时不应调用模型')
    });
    assert.deepEqual(await ask(question), fallback);
    await assert.rejects(ask(' '), /问题不能为空/);
});
