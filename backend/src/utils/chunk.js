export function splitText(
    text,
    chunkSize = 500,
    overlap = 100
) {
    if (overlap >= chunkSize) {
        throw new Error('overlap 必须小于 chunkSize');
    }

    const chunks = [];

    let start = 0;

    while (start < text.length) {
        const end = Math.min(
            start + chunkSize,
            text.length
        );

        const content = text
            .slice(start, end)
            .trim();

        if (content) {
            chunks.push({
                content,
                start,
                end
            });
        }

        if (end === text.length) break;

        start = end - overlap;
    }

    return chunks;
}