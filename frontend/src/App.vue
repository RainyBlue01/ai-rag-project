<script setup>
import { ref } from 'vue';

const examples = [
    '公司 VPN 如何完成身份认证？',
    '公司 VPN 账号审批要几个工作日？'
];
const question = ref('');
const input = ref(null);
const validation = ref('');
const failure = ref('');
const loading = ref(false);
const result = ref(null);
let lastQuestion = '';

function selectExample(example) {
    question.value = example;
    validation.value = '';
    input.value?.focus();
}

async function submit(value = question.value) {
    if (loading.value) return;
    const query = value.trim();
    if (!query) {
        validation.value = '请填写问题。';
        input.value?.focus();
        return;
    }

    question.value = value;
    lastQuestion = value;
    validation.value = '';
    failure.value = '';
    result.value = null;
    loading.value = true;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: query })
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!['answered', 'insufficient_context'].includes(data?.status) ||
            typeof data.answer !== 'string' || !Array.isArray(data.sources)) {
            throw new Error();
        }
        result.value = data;
    } catch {
        failure.value = '问答服务暂不可用，请稍后重试。';
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <header class="topbar">
        <div class="topbar-content">
            <span class="brand-icon" aria-hidden="true">IT</span>
            <span>企业 IT 知识库</span>
        </div>
    </header>

    <main>
        <h1>知识库问答</h1>
        <p class="intro">查询公司 IT 文档，查看答案和出处。</p>

        <form class="panel" @submit.prevent="submit()">
            <label for="question">你的问题</label>
            <textarea
                id="question"
                ref="input"
                v-model="question"
                rows="3"
                maxlength="1000"
                placeholder="例如，公司 VPN 如何完成身份认证？"
                :disabled="loading"
                :aria-invalid="Boolean(validation)"
                :aria-describedby="validation ? 'validation' : undefined"
                @input="validation = ''"
            ></textarea>
            <p v-if="validation" id="validation" class="error" role="alert">{{ validation }}</p>
            <div class="actions">
                <button type="submit" class="primary" :disabled="loading">
                    {{ loading ? '正在查询…' : '查询知识库' }}
                </button>
            </div>
        </form>

        <div class="examples">
            <span>试试这些问题</span>
            <button v-for="example in examples" :key="example" type="button"
                :disabled="loading" @click="selectExample(example)">
                {{ example }}
            </button>
        </div>

        <div role="status" aria-live="polite">
            <p v-if="loading" class="panel feedback">正在查询知识库…</p>
            <section v-else-if="result" class="panel response">
                <h2>{{ result.status === 'answered' ? '答案' : '资料不足' }}</h2>
                <p class="answer">{{ result.answer }}</p>
                <div v-if="result.status === 'answered' && result.sources.length" class="sources">
                    <h3>引用来源</h3>
                    <ul>
                        <li v-for="source in result.sources" :key="source.id">
                            <span class="citation">[{{ source.id }}]</span>
                            <span>{{ source.source || '未知文件' }}</span>
                            <small>{{ source.chunkId }}</small>
                        </li>
                    </ul>
                </div>
            </section>
        </div>

        <section v-if="failure" class="panel feedback">
            <p class="error" role="alert">{{ failure }}</p>
            <button type="button" @click="submit(lastQuestion)">重试</button>
        </section>
    </main>
</template>
