import { askKnowledge } from './services/ragService.js';

try {
    const question = process.argv.slice(2).join(' ');
    const result = await askKnowledge(question);
    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
