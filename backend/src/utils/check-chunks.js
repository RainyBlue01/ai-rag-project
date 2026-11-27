import {
  getKnowledgeCollection
} from '../services/vectorStore.js';

async function main() {
  const collection = await getKnowledgeCollection();

  const count = await collection.count();

  console.log('Collection 名称:', collection.name);
  console.log('Chunk 总数量:', count);

  const result = await collection.get({
    limit: 5,
    include: ['documents', 'metadatas']
  });

  console.log('\n前 5 条记录：');

  console.log(JSON.stringify({
    ids: result.ids,
    documents: result.documents,
    metadatas: result.metadatas
  }, null, 2));
}

main().catch(console.error);