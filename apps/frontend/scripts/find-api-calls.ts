import { Project, SyntaxKind, CallExpression } from 'ts-morph';
import * as fs from 'fs';
import * as path from 'path';

const project = new Project();
project.addSourceFilesAtPaths(path.resolve(__dirname, "../app/dashboard/(crm-and-sales-app)/**/*.tsx").replace(/\\/g, '/'));

const filesToMigrate = new Set<string>();

const sourceFiles = project.getSourceFiles();

sourceFiles.forEach(sourceFile => {
    sourceFile.forEachDescendant(node => {
        if (node.getKind() === SyntaxKind.CallExpression) {
            const callExpr = node as CallExpression;
            const expression = callExpr.getExpression().getText();
            
            if (expression.startsWith('api.')) {
                filesToMigrate.add(sourceFile.getFilePath());
            }
        }
    });
});

console.log(`Files to migrate in CRM:`);
Array.from(filesToMigrate).forEach(f => console.log(f));
