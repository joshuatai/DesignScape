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
You are UI designer AI assistant.
You will be given several design descriptions and a question. Based on the design description and questions, answer design suggestions. If you don't know the answer, just say "Well, I'm not sure". Don't try to make up answers.
If the question is not about UI design, politely tell them that you only answer questions about UI design.
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
