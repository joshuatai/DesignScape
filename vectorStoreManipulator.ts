import fs from 'fs';
import path from 'path';
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

class VectorStoreManipulator {
  private dataPath = './data/projects';
  private embeddings = new OpenAIEmbeddings({
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME_TEXT_EMBEDDING
  });
  constructor (options: any) {
    const { source = 'project' } =  options;
    if (source === 'tonic-ui') {
      this.dataPath = './data/tonic-ui';
    }
  }
  async search (query: string, k: number = 5): Promise<any> {
    let results = null;
    if (this.isExist(path.resolve(this.dataPath, 'docstore.json'))) {
      const vectorStore = await HNSWLib.load(this.dataPath, this.embeddings);
      results = await vectorStore.similaritySearchWithScore(query, k);
      results = results.map(r => r[0].pageContent);
    }
    return results;
  }
  async save (context: string): Promise<any> {
    const embeddings = new OpenAIEmbeddings({
      azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME_TEXT_EMBEDDING
    });
    /* Split the text into chunks using character, not token, size */
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000
    });
    const docs = await textSplitter.createDocuments([context]);
    if (this.isExist(path.resolve(this.dataPath, 'docstore.json'))) {
      const vectorStore = await HNSWLib.load(this.dataPath, embeddings);
      vectorStore.addDocuments(docs);
      vectorStore.save(this.dataPath);
    } else {
      /* Create the vectorstore */
      const vectorStore = await HNSWLib.fromDocuments(docs, embeddings);
      await vectorStore.save(this.dataPath);
    }
  }
  private isExist (path: string): boolean {
    return fs.existsSync(path);
  }
}
export default VectorStoreManipulator;
