import fs from 'fs';
import path from 'path';
import { JsonObject } from 'swagger-ui-express';

const swaggerFiles = ['admin.json', 'user.json', 'contact.json', 'call.json', 'credit.json', 'notification.json', 'call-rate.json', 'payment.json'];

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
                url: `https://a6f3-223-178-212-60.ngrok-free.app/kokutalk`,
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
        const env  = process.env.NODE_ENV || "development";
        const documentPath = env == "local" ? __dirname : __dirname + "../../"
        const filePath = path.join(documentPath, 'swagger', file);
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