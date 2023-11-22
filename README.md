Installation
------------

1. Run docker qdrant
   ```
   docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
   ```
2. Install dependencies
   ```
   npm install
   ```
3. Update OpenAPI key in packages.json
   ```
   "scripts": {
      "embedding": "cross-env OPENAI_API_KEY=<OpenAI API Key> ts-node embedding.ts"
   }

   ```
4. Run
   ```
   npm run embedding
   ```
