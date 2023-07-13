import path from 'node:path';
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import dotenv from 'dotenv';

dotenv.config();

const dir = path.resolve(process.cwd(), 'data');
const embeddings = new OpenAIEmbeddings({
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME_TEXT_EMBEDDING,
});
const vectorStore = await HNSWLib.load(dir, embeddings);

const result = await vectorStore.similaritySearch('Demonstrate how to use the `sx` prop', 1);

console.log(result);
