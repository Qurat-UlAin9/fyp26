//# queries Pinecone + knowledge_chunks

/**
 
 
backend/
├── services/
│   ├── ai/
│   │   ├── agent.js              # Main ADHD Agent orchestrator — decides which tool(s) to call
│   │   ├── tools/
│   │   │   ├── taskTool.js
│   │   │   ├── habitTool.js
│   │   │   ├── focusTool.js
│   │   │   ├── emotionTool.js
│   │   │   ├── exerciseTool.js
│   │   │   ├── memoryTool.js      # reads/writes user_memories
│   │   │   └── knowledgeTool.js   # queries Pinecone + knowledge_chunks
│   │   ├── memory/
│   │   │   ├── memoryStore.js     # get/set user_memories, embed + upsert to Pinecone
│   │   │   └── memoryRetrieval.js # similarity search over a user's own memories
│   │   ├── rag/
│   │   │   ├── pineconeClient.js  # thin wrapper: query(namespace, vector, topK, filter)
│   │   │   ├── embeddings.js      # BGE embedding calls (mirrors your rag/ pipeline's model+prefix)
│   │   │   └── retriever.js       # combines Pinecone results + Postgres full-text fallback
│   │   ├── llmClient.js           # wraps Anthropic/OpenAI call, streaming support
│   │   └── promptBuilder.js       # assembles system prompt + retrieved context + memory + history
├── routes/
│   ├── ai.js                      # POST /api/ai/chat — the endpoint ChatbotScreen.js calls
│   └── knowledge.js               # existing, stays as-is or becomes thin wrapper around knowledgeTool
 
 
 */