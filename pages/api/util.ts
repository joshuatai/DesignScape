import { OpenAI } from 'langchain/llms/openai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import {
  LLMChain,
  ConversationalRetrievalQAChain,
  loadQAChain,
} from 'langchain/chains';
import { HNSWLib } from 'langchain/vectorstores/hnswlib';
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
  SystemMessagePromptTemplate,
} from 'langchain/prompts';
import { AIChatMessage, HumanChatMessage } from 'langchain/schema';

const questionGeneratorChainPrompt = ChatPromptTemplate.fromPromptMessages(
  [
    SystemMessagePromptTemplate.fromTemplate(
    `Given the following conversation between a user and an assistant, rephrase the last question from the user to be a standalone question.`
    ),
    new MessagesPlaceholder('chat_history'),
    HumanMessagePromptTemplate.fromTemplate(`Last question: {question}`),
  ],
);

const QA_PROMPT_TEMPLATE = `
You are an AI assistant for the Tonic UI component library. The documentation is located at https://trendmicro-frontend.github.io/tonic-ui/react/latest.
You are given the following extracted parts of a long document and a question. Provide a conversational answer with a hyperlink to the documentation.
You should only use hyperlinks that are explicitly listed as a source in the context. Do NOT make up a hyperlink that is not listed.
If the question includes a request for code, provide a code block directly from the documentation.
If you don't know the answer, just say 'Hmm, I'm not sure.' Don't try to make up an answer.
If the question is not about Tonic UI component library, politely inform them that you are tuned to only answer questions about Tonic UI component library.
Question: {question}
=========
{context}
=========
Answer in Markdown:
`;

export const makeChain = (
  vectorStore: HNSWLib,
  onTokenStream?: (token: string) => Promise<void>
) => {
  const qaChain = loadQAChain(
    // llm
    new ChatOpenAI({
      azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME_GPT,
      temperature: 0,
      streaming: Boolean(onTokenStream),
      callbacks: [
        {
          handleLLMNewToken: (token) => {
            onTokenStream?.(token);
          },
        },
      ],
    }),
    // params
    {
      type: 'stuff',
      prompt: PromptTemplate.fromTemplate(QA_PROMPT_TEMPLATE),
      //verbose: true,
    }
  );

  const questionGeneratorChain = new LLMChain({
    llm: new OpenAI({
      azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME_GPT,
      temperature: 0,
    }),
    prompt: questionGeneratorChainPrompt,
    //verbose: true,
  });

  return new ConversationalRetrievalQAChain({
    retriever: vectorStore.asRetriever(),
    combineDocumentsChain: qaChain,
    questionGeneratorChain,
    returnSourceDocuments: true,
    verbose: true,
  });
}

export const formatHistory = (history: [string, string][]) =>
  history.flatMap(([q, a]) => [new HumanChatMessage(q), new AIChatMessage(a)]);
