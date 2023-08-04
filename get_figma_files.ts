// API doc reference:
// https://www.figma.com/developers/api#projects
// https://www.figma.com/developers/api#files

import axios from "axios";
import parse from './reduce_properties';
import convert from './nodes2description';
import VectorStoreManipulator from './vectorStoreManipulator';
import dotenv from 'dotenv';

dotenv.config();

// Set your Figma access token


// Define API endpoint URL
const apiUrl = "https://api.figma.com/v1";
const accessToken = process.env.FIGMA_TOKEN;

// Send HTTP GET request
async function sendGetRequest(url: string, headers: Record<string, string>) {
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    console.error("HTTP request error:", error);
    return null;
  }
}

// Get project list
async function getProjectList(teamId: string) {
  const headers = {
    "X-Figma-Token": accessToken,
  };
  try {
    // Get project list
    const projectsUrl = `${apiUrl}/teams/${teamId}/projects`;
    const projectsResponse = await sendGetRequest(projectsUrl, headers);
    const projects = projectsResponse ? projectsResponse.projects : null;
  
    return projects;
  } catch (error) {
    console.error("Error getting projects:", error);
    return null;
  }
}

// Get file list
async function getFileList(projectId: string) {
  const headers = {
    "X-Figma-Token": accessToken,
  };
  try {
    // Get file list
    const filesUrl = `${apiUrl}/projects/${projectId}/files`;
    const filesResponse = await sendGetRequest(filesUrl, headers);
    const files = filesResponse ? filesResponse.files : null;
    return files;
  } catch (error) {
    console.error("Error getting files:", error);
    return null;
  }
}
// Get node tree
async function getNodeList(fileKey: string) {
  const headers = {
    "X-Figma-Token": accessToken,
  };
  try {
    const nodesUrl = `${apiUrl}/files/${fileKey}`;
    const nodesResponse = await sendGetRequest(nodesUrl, headers);
    const nodes = nodesResponse ? nodesResponse : null;
    return nodes;
  } catch (error) {
    console.error("Error getting nodes:", error);
    return null;
  }
}

// Execute the code, get and display project list and file list
const teamId = "1080750874950476239";
const page: any = {};
(async () => {
  const vectorStoreManipulator = new VectorStoreManipulator({});
  const projects = await getProjectList(teamId);
  if (projects) {
    console.log("Project List:");
    projects.forEach(async (project: { id: string, name: string }) => {
      if (project.name === 'Elixir') {
        console.log(`Project Name: ${project.name}`);
        const files = await getFileList(project.id);
        if (files) {
          console.log("File List:");
          files.forEach(async (file: { key: string, name: string }) => {
            if (file.name === 'Elixir') {
              console.log(file.name, file.key);
              const nodes = await getNodeList(file.key);
              if (nodes) {
                nodes.document.children.filter((child: any) => {
                  console.log(child.name);
                  return child.name === 'Elixir Client';
                })[0].children.forEach(async (child: any) => {
                  // if (child.name === 'Init Page' && !page['Init Page']) {
                  //   page[child.name] = true;
                  //   parse(child);
                  //   // console.log(JSON.stringify(child));
                  //   const description = await convert(JSON.stringify(child));
                  //   VectorStore.save(description.join('\n'));
                  // }
                  // if (child.name === 'Screen' && !page['Screen']) {
                  //   page[child.name] = true;
                  //   parse(child);
                  //   // console.log(JSON.stringify(child));
                  //   const description = await convert(child);
                  //   // console.log(description);
                  // }
                  if (child.name === 'Screen' && !page['Screen']) {
                    page[child.name] = true;
                    parse(child);
                    // console.log(JSON.stringify(child));
                    const description = await convert(child);
                    // console.log(description);
                    vectorStoreManipulator.save(description);
                    console.log('finish');
                  }
                });
              }
            }
          });
        }
      }
    });
  }
})();
