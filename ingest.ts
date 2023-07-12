import path from 'path';
import { HNSWLib } from 'langchain/vectorstores/hnswlib';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import {
  MarkdownTextSplitter,
  RecursiveCharacterTextSplitter,
  SupportedTextSplitterLanguages,
} from 'langchain/text_splitter';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import * as fs from 'fs';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { Document } from 'langchain/document';
import { BaseDocumentLoader } from 'langchain/document_loaders/base';
import { load } from 'cheerio';

async function processFile(filePath: string): Promise<Document> {
  return await new Promise<Document>((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, fileContents) => {
      if (err) {
        reject(err);
      } else {
        const text = load(fileContents).text();
        const metadata = { source: filePath };
        const doc = new Document({ pageContent: text, metadata: metadata });
        resolve(doc);
      }
    });
  });
}

async function processDirectory(directoryPath: string, match: string): Promise<Document[]> {
  const docs: Document[] = [];
  let files: string[];
  try {
    files = fs.readdirSync(directoryPath);
  } catch (err) {
    console.error(err);
    throw new Error(
      `Could not read directory: ${directoryPath}. Did you run \`sh download.sh\`?`
    );
  }
  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const newDocs = processDirectory(filePath, match);
      const nestedDocs = await newDocs;
      docs.push(...nestedDocs);
    } else {
      if (filePath.endsWith(match)) {
        const newDoc = processFile(filePath);
        const doc = await newDoc;
        docs.push(doc);
      }
    }
  }
  return docs;
}

class ReadTheDocsLoader extends BaseDocumentLoader {
  constructor(public filePath: string) {
    super();
  }
  async load(match): Promise<Document[]> {
    return await processDirectory(this.filePath, match);
  }
}

const directoryPath = 'docs/pages';
const loader = new ReadTheDocsLoader(directoryPath);

export const run = async () => {
  const jsDocs = await (async () => {
    const docs = await loader.load('.js');
    const textSplitter = RecursiveCharacterTextSplitter.fromLanguage('js', {
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    return await textSplitter.splitDocuments(docs);
  })();

  const mdxDocs = await (async () => {
    const docs = await loader.load('.mdx');
    const textSplitter = RecursiveCharacterTextSplitter.fromLanguage('markdown', {
      chunkSize: 1000,
      chunkOverlap: 0,
    });
    return await textSplitter.splitDocuments(docs);
  })();

  console.log(jsDocs.length, mdxDocs.length);

  const docs = [
    ...mdxDocs,
    ...jsDocs,
  ];

  /*
  const dir = path.resolve('docs');
  const loaders = {
    //'.js': (path) => new TextLoader(path),
    //'.json': (path) => new JSONLoader(path),
    '.mdx': (path) => new TextLoader(path),
  };
  const recursive = true;
  const unknown = 'warn'; // One of: 'ignore', 'error', 'warn'

  const loader = new DirectoryLoader(dir, loaders, recursive, unknown);
  const splitter = new MarkdownTextSplitter();
  const docs = await loader.loadAndSplit(splitter);
  */

  const embeddings = new OpenAIEmbeddings({
    azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME_TEXT_EMBEDDING,
  });

  console.log(`Creating vector store: docs=${docs.length}, model="${process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME_TEXT_EMBEDDING}"`);
  const vectorStore = await HNSWLib.fromDocuments(docs, embeddings);

  console.log('Saving vector store to disk...');
  await vectorStore.save('data');
};

(async () => {
  await run();
})();
