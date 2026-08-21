import { Project, SyntaxKind, CallExpression } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

const project = new Project();
project.addSourceFilesAtPaths("app/dashboard/**/*.tsx");

const endpoints = new Map<string, { method: string, domain: string }>();

const sourceFiles = project.getSourceFiles();

sourceFiles.forEach(sourceFile => {
    const filePath = sourceFile.getFilePath();
    // Determine domain from path, e.g., (crm-and-sales-app) -> crm-and-sales
    const match = filePath.match(/\((.*?)-app\)/);
    const domain = match ? match[1] : 'dashboard';

    sourceFile.forEachDescendant(node => {
        if (node.getKind() === SyntaxKind.CallExpression) {
            const callExpr = node as CallExpression;
            const expression = callExpr.getExpression().getText();
            
            if (expression.startsWith('api.')) {
                const method = expression.split('.')[1]; // get, post, put, delete
                if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
                    const args = callExpr.getArguments();
                    if (args.length > 0) {
                        const urlArg = args[0];
                        let url = '';
                        
                        if (urlArg.getKind() === SyntaxKind.StringLiteral || urlArg.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
                            url = urlArg.getText().replace(/['"`]/g, '');
                        } else if (urlArg.getKind() === SyntaxKind.TemplateExpression) {
                            // Simplify template literals by just taking the raw text
                            url = urlArg.getText(); 
                        }

                        if (url && !url.includes('${') && url.startsWith('/')) { // Ignore complex dynamic ones for now
                           endpoints.set(url, { method, domain });
                        }
                    }
                }
            }
        }
    });
});

console.log(`Found ${endpoints.size} static API endpoints.`);

// Generate the RTK Query endpoints
const apiImports = `import { baseApi } from "./baseApi";\n\n`;
let apiContent = apiImports + `export const generatedApi = baseApi.injectEndpoints({\n  endpoints: (builder) => ({\n`;

endpoints.forEach((info, url) => {
    // Generate a hook name like getApiSalesLeadsPipeline
    const nameParts = url.split('/').filter(p => p !== '' && p !== 'api');
    const hookName = info.method + nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, '')).join('');
    
    if (info.method === 'get') {
        apiContent += `    ${hookName}: builder.query({\n`;
        apiContent += `      query: () => '${url}',\n`;
        apiContent += `      providesTags: ['${info.domain}'],\n`;
        apiContent += `    }),\n`;
    } else {
        apiContent += `    ${hookName}: builder.mutation({\n`;
        apiContent += `      query: (body) => ({\n`;
        apiContent += `        url: '${url}',\n`;
        apiContent += `        method: '${info.method.toUpperCase()}',\n`;
        apiContent += `        body,\n`;
        apiContent += `      }),\n`;
        apiContent += `      invalidatesTags: ['${info.domain}'],\n`;
        apiContent += `    }),\n`;
    }
});

apiContent += `  }),\n  overrideExisting: false,\n});\n\n`;
apiContent += `export const {\n`;

endpoints.forEach((info, url) => {
    const nameParts = url.split('/').filter(p => p !== '' && p !== 'api');
    const hookName = info.method + nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, '')).join('');
    const exportName = `use${hookName.charAt(0).toUpperCase() + hookName.slice(1)}${info.method === 'get' ? 'Query' : 'Mutation'}`;
    apiContent += `  ${exportName},\n`;
});

apiContent += `} = generatedApi;\n`;

fs.writeFileSync('redux/api/generatedApi.ts', apiContent);
console.log('Successfully generated redux/api/generatedApi.ts');
