import 'dotenv/config';

export async function generateAnswer(messages) {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
        throw new Error('缺少 DEEPSEEK_API_KEY，请检查 backend/.env');
    }

    const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com')
        .replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
            messages,
            thinking: { type: 'disabled' },
            response_format: { type: 'json_object' },
            max_tokens: 1024
        }),
        signal: AbortSignal.timeout(30_000)
    });

    if (!response.ok) {
        throw new Error(`DeepSeek API 请求失败（HTTP ${response.status}）`);
    }

    const result = await response.json();
    const choice = result.choices?.[0];
    if (choice?.finish_reason !== 'stop' || !choice.message?.content?.trim()) {
        throw new Error('DeepSeek 未返回完整答案');
    }

    return JSON.parse(choice.message.content);
}
