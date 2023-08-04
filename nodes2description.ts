import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanMessage, SystemMessage } from "langchain/schema";
import { get_encoding, encoding_for_model } from "@dqbd/tiktoken";
import { resolve } from "path";

const chat = new ChatOpenAI({
  azureOpenAIApiDeploymentName: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME_GPT,
  temperature: 0.5
});
const encoding = encoding_for_model("gpt-3.5-turbo");
const max_input_token = 3000;

// This function sends a user prompt message to a chatbot and receives a response.
const completion = async (message: string) => {
  // Create a SystemMessage object containing the instructions for the chatbot.
  const response = await chat.call([
    // The chatbot is designed to answer specific questions related to UI design.
    new SystemMessage(
      `You are a design assistant that help me to analyze the UI design. Base on the user prompt, anwser the below questions:
        - Color mode: is the UI a dark mode or light mode?
        - Component: what's the component?
        - Layout: the layout structure
        - Functions: what's the function look like?
        - Data format: are there any data in the component. If yes, list the data formats
      `
    ),
    // Create a HumanMessage object with the user's input message.
    new HumanMessage(message)
  ]);
  return response.content;
}

const convertMultiple = (children: Array<any>, level = 0) => {
  const promises = children.map((child: any) => {
    return new Promise(async (resolve, reject) => {
      const descripton = await convert(child, level);
      resolve(descripton);
    });
  })
  return Promise.all(promises);
};

// This function converts a given nodes object to an array of descriptions using async operations.
const convert = async (nodes: any, level: number = 0) => {
  const nodeString = JSON.stringify(nodes)
  const tokens = encoding.encode(nodeString);
  if (level >= 2) {
    return '';
  }
  // Check if the number of tokens exceeds the maximum input token limit.
  if (tokens.length > max_input_token) {
    console.log(tokens.length)
    // Extract and convert only the "children" property of each node,
    const _children = nodes.children.map((child: any) => {
      const { children, ...rest } = child;
      return {
        ...rest
      };
    });
    // Create a new object containing all properties of the parent node except for "children".
    const parentData: any = {};
    for(const preperty in nodes) {
      if (preperty !== 'children') {
        parentData[preperty] = nodes[preperty];
      }
    }
    parentData['children'] = _children;
    // Generate a description for the modified parentData object using the completion function.
    let description = await completion(JSON.stringify(parentData));
    let descriptions = [`
      Container:
      ${description}
    `];
    
    // Check if the original nodes object has multiple children.
    // If yes, convert each child separately and add their descriptions to the descriptions array.
    if (nodes.children && nodes.children.length > 1) {
      const _des: Array<any> = await convertMultiple(nodes.children, level + 1);
      descriptions = descriptions.concat(_des);
    }
    const _des = descriptions.flat().join('\n');
    return _des;
  } else {
    // If the token limit is not exceeded, generate a description for the original nodeString.
    const _des = await completion(nodeString);
    return _des;
  }
};

const summarizeMessage = `You are a design assistant that help me to summarize design descrptions for few questions 1. is the UI a dark mode or light mode 2. the layout structure 3. what's the feature of the content? 4. list the data formats from components. Base on the user prompt:`
export const consolidate = async (description: string) => {
  const response = await chat.call([
    new SystemMessage(summarizeMessage),
    new HumanMessage(description)
  ]);
  return response.content;
};

export default convert;
