import {QdrantClient} from "@qdrant/js-client-rest";
import * as CryptoJS from 'crypto-js';
import OpenAI from "openai";
import * as fs from 'fs';

const client = new QdrantClient({host: "localhost", port: 6333});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

const QDRANT_COLLECTION_NAME = "profile";

function readFileToString(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

const createIndices = async () => {
    await client.createCollection(QDRANT_COLLECTION_NAME, {
        vectors: {size: 1536, distance: "Dot"},
    });
};

function calculateMD5(input: string): string {
    const md5Hash = CryptoJS.MD5(input);
    return md5Hash.toString(CryptoJS.enc.Hex);
}

const createIndexs = async () => {
    // // Get embeddings for documents
    const documents = [
        await readFileToString("samples/cv.txt"),
        await readFileToString("samples/family.txt"),
        await readFileToString("samples/article.txt")
    ]; // sample documents
    documents.forEach((document, index) => {
        const input = {input: document, model: "text-embedding-ada-002"};
        openai.embeddings.create(input)
            .then(async (response) => {
                const embedding = response.data[0].embedding;
                // console.log(response.data[0]);
                const operationInfo = await client.upsert(QDRANT_COLLECTION_NAME, {
                    wait: true,
                    points: [
                        {id: calculateMD5(document), vector: embedding, payload: {content: document}}
                    ],
                });
            })
            .catch((e) => {
                console.log(e.message);
                throw new Error("Failed once, dont try again");
            });
    });
};
const query = (query: string) => {
    const input = {input: query, model: "text-embedding-ada-002"};
    openai.embeddings.create(input).then(async (response) => {
        const query_embedding = response.data[0].embedding;

        let searchResult = await client.search(QDRANT_COLLECTION_NAME, {
            vector: query_embedding,
            limit: 3,
        });

        const params: OpenAI.Chat.ChatCompletionCreateParams = {
            messages: [
                {
                    role: 'system',
                    content: `When answering the user reference to this three articles: Article 1 --- ${searchResult[0]?.payload?.content}`,
                },
                {
                    role: 'system',
                    content: `Article 2 --- ${searchResult[1]?.payload?.content}`,
                },
                {
                    role: 'system',
                    content: `Article 3 --- ${searchResult[2]?.payload?.content}`,
                },
                {
                    role: "user",
                    content: query,
                },
            ],
            model: 'gpt-3.5-turbo'
        };
        const chatCompletion: OpenAI.Chat.ChatCompletion = await openai.chat.completions.create(params);

        console.log(JSON.stringify(chatCompletion.choices));

    });
};
const main = async () => {
    await createIndices();
    await createIndexs()
    // query("What is Harold J. Thompson education backgrounds?")
    query("When is Harold J. Thompson's father birthday?")
};
main();
