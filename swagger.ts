// Creates basic structure of swagger documentation for end points in a route file
const swaggerAutogen = require('swagger-autogen')();
import path from "path";
import { loadConfig } from "./app/helper/config";
loadConfig();

const routes = ["users.ts"];

const options = {
  openapi: '3.0.0',
  info: {
      title: 'Kokutalk API',
      version: '1.0.0'
  },
  servers: [
      {
          url: `${process.env.SERVER_URL}`,
          description: 'Testing server'
      }
  ],
  components: {
  },
  paths: {},
  tags: []
}

for(let route of routes) {
  const fullRoutePath = path.join(__dirname, "app", "routes", route);
  const routeFileName = route.replace(".ts", "")
  const formattedFileName = route.replace(".ts", "").replace("_", " ");
  const formattedFileNameDesc = formattedFileName.split(" ")
  let formattedTagName = "";
  for(let currName of formattedFileNameDesc) {
    let currFormattedTag = currName.charAt(0).toUpperCase() + currName.substring(1);
    formattedTagName += currFormattedTag + " ";
  }
  formattedTagName = formattedTagName.trim();
  // json file storing documentation of route file
  const documentationPath =  path.join(__dirname, "swagger", routeFileName + "1" + ".json");
  options["tags"] = [{
    name: formattedTagName,
    description: `API for ${formattedFileName} CRUD operations`
  }] as any;
  swaggerAutogen(documentationPath, [fullRoutePath], options)
}