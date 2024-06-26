import fs from 'fs';
import path from 'path';
import { JsonObject } from 'swagger-ui-express';

const swaggerFiles = ['user.json', 'contact.json', 'call.json'];

function readJSONFile(filePath:string) : JsonObject | null {
    try {
        const jsonString = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(jsonString);
    } catch (error) {
        console.error(`Error reading JSON file ${filePath}: ${error}`);
        return null;
    }
}

export function mergeSwaggerFiles() {
    let mergedSwagger : any  = {
        openapi: '3.0.0',
        info: {
            title: 'Kokutalk API',
            version: '1.0.0'
        },
        servers: [
            {
                url: `https://ecb0-38-183-77-37.ngrok-free.app/api`,
                description: 'Ngrok server'
            },
            {
                url: `${process.env.SERVER_URL}`,
                description: 'Testing server'
            }
        ],
        components: {
        },
        paths: {},
        tags : []
    };

    swaggerFiles.forEach((file) => {
        const filePath = path.join(__dirname, 'swagger', file);
        const swagger = readJSONFile(filePath) 

        if (swagger) {
            Object.keys(swagger.paths).forEach(path => {
                if (!mergedSwagger.paths[path]) {
                    mergedSwagger.paths[path] = {};
                }
                Object.assign(mergedSwagger.paths[path], swagger.paths[path]);
            });
            let curr_swagger_components = swagger.components ? Object.keys(swagger.components) : [];
            curr_swagger_components.forEach(component => {
                if (!mergedSwagger.components[component]) {
                    mergedSwagger.components[component] = {};
                }
                Object.assign(mergedSwagger.components[component], swagger.components[component]);
            });
            if(swagger.tags) {

              mergedSwagger.tags = [...mergedSwagger.tags, ...swagger?.tags]
            }
        }
    });

    return mergedSwagger;
}