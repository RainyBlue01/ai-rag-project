const MAX_BODY_BYTES = 16 * 1024;

function sendJson(response, status, body) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(body));
}

export function createChatHandler(askKnowledge) {
    return async (request, response) => {
        if (request.url.split('?')[0] !== '/api/chat') {
            return sendJson(response, 404, { error: '接口不存在' });
        }

        if (request.method !== 'POST') {
            response.setHeader('Allow', 'POST');
            return sendJson(response, 405, { error: '请使用 POST' });
        }

        let body;
        try {
            let size = 0;
            const chunks = [];
            for await (const chunk of request.iterator({ destroyOnReturn: false })) {
                size += chunk.length;
                if (size > MAX_BODY_BYTES) {
                    request.resume();
                    return sendJson(response, 413, { error: '请求体过大' });
                }
                chunks.push(chunk);
            }
            body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
            if (!response.destroyed) {
                sendJson(response, 400, { error: '请求体必须是有效的 JSON' });
            }
            return;
        }

        if (typeof body?.question !== 'string' || !body.question.trim()) {
            return sendJson(response, 400, { error: '请填写问题' });
        }

        try {
            const { answer, sources } = await askKnowledge(body.question.trim());
            return sendJson(response, 200, {
                status: sources.length ? 'answered' : 'insufficient_context',
                answer,
                sources
            });
        } catch {
            return sendJson(response, 502, { error: '问答服务暂不可用，请稍后重试' });
        }
    };
}
