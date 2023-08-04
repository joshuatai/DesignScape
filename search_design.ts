import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanMessage, SystemMessage } from "langchain/schema";
import VectorStoreManipulator from "./vectorStoreManipulator";

const chat = new ChatOpenAI({
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME_GPT,
  temperature: 0.5
});

class DesignSearch {
  verify = async (query: string): Promise<boolean> => {
    const response = await chat.call([
      // The chatbot is designed to verify the user query
      new SystemMessage(
        `You are a design assistant that help me to analyze the UI design. Base on the user prompt, answers the user prompt whether it is design related, true if yes, false if no`
      ),
      // Create a HumanMessage with the user's prompt. //user query
      new HumanMessage(query)
    ]);
    return response.content.indexOf('true') > -1;
  }
  search = (query: string) => {
    return new Promise(async (resolve, reject) => {
      // Verify query type
      const isValid = await this.verify(query);
      if (isValid) {
        // search Tonic UI design
        const tonicUIManipulator = new VectorStoreManipulator({
          source: 'tonic-ui'
        });
        const tonicUIResults = tonicUIManipulator.search(query);
        // search Project UI design
        const projectManipulator = new VectorStoreManipulator({
          source: 'project'
        });
        const projectUIResults = projectManipulator.search(query);
        resolve({
          tonicUI: tonicUIResults,
          project: projectUIResults
        });
      } else {
        reject('invalid user query');
      }
    });
  }
}