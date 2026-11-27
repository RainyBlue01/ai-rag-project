
/**
 * 将超长句子按字符切分
 */
function splitLongSentence(sentence, chunkSize) {
    const chars = Array.from(sentence);
    const result = [];

    for (let i = 0; i < chars.length; i += chunkSize) {
        result.push(
            chars.slice(i, i + chunkSize).join('')
        );
    }

    return result;
}

/**
 * 将段落拆分成句子
 */
function splitIntoSentences(paragraph) {
    return (
        paragraph.match(/[^。！？.!?]+[。！？.!?]?/gu) || []
    )
        .map(item => item.trim())
        .filter(Boolean);
}

/**
 * 文档 Chunk 切分
 */
export function splitText(text, options = {}) {
    const {
        chunkSize = 500,
        overlapSentences = 1
    } = options;

    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
        throw new Error('chunkSize 必须是正整数');
    }

    if (
        !Number.isInteger(overlapSentences) ||
        overlapSentences < 0
    ) {
        throw new Error('overlapSentences 必须是非负整数');
    }

    // 1. 文本预处理
    const normalized = text
        .replace(/\r\n/g, '\n')
        .trim();

    if (!normalized) return [];

    // 2. 按段落切分
    const paragraphs = normalized
        .split(/\n\s*\n/)
        .map(item => item.trim())
        .filter(Boolean);

    // 3. 按句子切分，处理超长句子
    const units = [];

    for (const paragraph of paragraphs) {
        const sentences = splitIntoSentences(paragraph);

        for (const sentence of sentences) {
            if (Array.from(sentence).length <= chunkSize) {
                units.push(sentence);
            } else {
                units.push(
                    ...splitLongSentence(sentence, chunkSize)
                );
            }
        }
    }

    // 4. 合并句子，生成 Chunk
    const chunks = [];
    let current = [];

    for (const unit of units) {
        const candidate = [...current, unit].join('\n');

        if (
            Array.from(candidate).length <= chunkSize
        ) {
            current.push(unit);
            continue;
        }

        if (current.length > 0) {
            chunks.push(current.join('\n'));
        }

        // 保留上一块最后几个句子
        const overlap = overlapSentences > 0
            ? current.slice(-overlapSentences)
            : [];

        const next = [...overlap, unit];

        // 如果重叠内容导致超长，则不保留重叠
        current =
            Array.from(next.join('\n')).length <= chunkSize
                ? next
                : [unit];
    }

    if (current.length > 0) {
        chunks.push(current.join('\n'));
    }

    return chunks;
}

/**
 * 构建带 Metadata 的知识片段
 */

/**
 * 构建带 Metadata 的知识片段
 */
export function buildChunks({
    text,
    documentId,
    title,
    category,
    department,
    version = 1,
    source,

    // 支持动态配置
    chunkSize = 500,
    overlapSentences = 1
}) {
    const contents = splitText(text, {
        chunkSize,
        overlapSentences
    });

    return contents.map((content, index) => ({
        chunkId: `${documentId}-v${version}-${String(index + 1).padStart(3, '0')}`,

        documentId,

        content,

        metadata: {
            title,
            category,
            department,
            version,
            source,
            chunkIndex: index,

            chunkSize,
            overlapSentences
        }
    }));
}

