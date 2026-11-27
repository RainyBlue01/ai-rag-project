import { createServer } from 'node:http';
import { createChatHandler } from './routes/chat.js';
import { askKnowledge } from './services/ragService.js';

const port = Number(process.env.PORT || 3000);
const server = createServer(createChatHandler(askKnowledge));

server.listen(port, '127.0.0.1', () => {
    console.log(`问答接口已启动 http://127.0.0.1:${server.address().port}/api/chat`);
});
