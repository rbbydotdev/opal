#!/usr/bin/env tsx

import { Project } from 'ts-morph';
import { execSync } from 'child_process';

interface UnusedItem {
  file: string;
  line: number;
  column: number;
  name: string;
  type: 'variable' | 'function' | 'class' | 'type' | 'parameter';
}

function parseUnusedErrors(): UnusedItem[] {
  try {
    // Run TypeScript compiler to get unused errors
    const output = execSync('npx tsc --noUnusedLocals --noUnusedParameters --noEmit', { 
      encoding: 'utf-8' 
    });
    return [];
  } catch (error: any) {
    const stderr = error.stdout || error.stderr || '';
    const lines = stderr.split('\n');
    const unused: UnusedItem[] = [];
    
    for (const line of lines) {
      // Parse: src/path/file.ts(line,col): error TS6133: 'name' is declared but its value is never read.
      // Parse: src/path/file.ts(line,col): error TS6196: 'name' is declared but never used.
      const match = line.match(/^(.+?)\((\d+),(\d+)\):.+?(?:TS6133|TS6196):\s*'(.+?)'\s*is declared/);
      if (match) {
        const [, file, lineNum, col, name] = match;
        
        // Skip src/app files as requested
        if (file.includes('src/app/')) continue;
        
        let type: UnusedItem['type'] = 'variable';
        if (line.includes('TS6196')) {
          type = 'type';
        }
        
        unused.push({
          file: file.trim(),
          line: parseInt(lineNum),
          column: parseInt(col),
          name: name.trim(),
          type
        });
      }
    }
    
    return unused;
  }
}

async function removeUnusedCode() {
  const project = new Project({
    tsConfigFilePath: 'tsconfig.json'
  });

  const unusedItems = parseUnusedErrors();
  console.log(`Found ${unusedItems.length} unused items to remove`);

  // Group by file for efficient processing
  const byFile = unusedItems.reduce((acc, item) => {
    if (!acc[item.file]) acc[item.file] = [];
    acc[item.file].push(item);
    return acc;
  }, {} as Record<string, UnusedItem[]>);

  let removedCount = 0;

  for (const [filePath, items] of Object.entries(byFile)) {
    try {
      const sourceFile = project.getSourceFile(filePath);
      if (!sourceFile) {
        console.log(`Warning: Could not find source file: ${filePath}`);
        continue;
      }

      console.log(`Processing ${filePath} (${items.length} items)`);

      // Sort by line number descending to remove from bottom up
      const sortedItems = items.sort((a, b) => b.line - a.line);

      for (const item of sortedItems) {
        try {
          if (item.type === 'type') {
            // Handle type aliases, interfaces, enums
            const typeAlias = sourceFile.getTypeAlias(item.name);
            const interfaceDecl = sourceFile.getInterface(item.name);
            const enumDecl = sourceFile.getEnum(item.name);
            
            if (typeAlias) {
              typeAlias.remove();
              removedCount++;
              console.log(`  Removed type alias: ${item.name}`);
            } else if (interfaceDecl) {
              interfaceDecl.remove();
              removedCount++;
              console.log(`  Removed interface: ${item.name}`);
            } else if (enumDecl) {
              enumDecl.remove();
              removedCount++;
              console.log(`  Removed enum: ${item.name}`);
            }
          } else {
            // Handle variables, functions, classes
            const variableStatement = sourceFile.getVariableStatement(stmt => 
              stmt.getDeclarations().some(decl => decl.getName() === item.name)
            );
            const functionDecl = sourceFile.getFunction(item.name);
            const classDecl = sourceFile.getClass(item.name);
            
            if (variableStatement) {
              const declarations = variableStatement.getDeclarations();
              if (declarations.length === 1) {
                // Remove entire statement if only one declaration
                variableStatement.remove();
              } else {
                // Remove just this declaration
                const targetDecl = declarations.find(d => d.getName() === item.name);
                targetDecl?.remove();
              }
              removedCount++;
              console.log(`  Removed variable: ${item.name}`);
            } else if (functionDecl) {
              functionDecl.remove();
              removedCount++;
              console.log(`  Removed function: ${item.name}`);
            } else if (classDecl) {
              classDecl.remove();
              removedCount++;
              console.log(`  Removed class: ${item.name}`);
            }
          }
        } catch (err) {
          console.log(`  Warning: Could not remove ${item.name}: ${err}`);
        }
      }

      // Save the file
      await sourceFile.save();
    } catch (err) {
      console.error(`Error processing ${filePath}:`, err);
    }
  }

  console.log(`\nSuccessfully removed ${removedCount} unused items`);
}

// Run the script
removeUnusedCode().catch(console.error);