#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UnusedExport {
  filePath: string;
  exports: string[];
}

function parseUnusedExports(output: string): UnusedExport[] {
  const lines = output.trim().split('\n');
  const results: UnusedExport[] = [];
  
  for (const line of lines) {
    if (line.includes(': ')) {
      const [filePath, exportsStr] = line.split(': ');
      const exports = exportsStr.split(', ').map(exp => exp.trim());
      results.push({ filePath, exports });
    }
  }
  
  return results;
}

function removeExportFromCode(code: string, exportName: string): string {
  // Match different export patterns
  const patterns = [
    // export const functionName = 
    new RegExp(`^export (const ${exportName}\\s*=.*)$`, 'gm'),
    // export function functionName
    new RegExp(`^export (function ${exportName}\\s*\\(.*)$`, 'gm'),
    // export class ClassName
    new RegExp(`^export (class ${exportName}\\s*.*)$`, 'gm'),
    // export interface InterfaceName
    new RegExp(`^export (interface ${exportName}\\s*.*)$`, 'gm'),
    // export type TypeName
    new RegExp(`^export (type ${exportName}\\s*.*)$`, 'gm'),
    // export enum EnumName
    new RegExp(`^export (enum ${exportName}\\s*.*)$`, 'gm'),
  ];

  let updatedCode = code;
  
  for (const pattern of patterns) {
    updatedCode = updatedCode.replace(pattern, '$1');
  }
  
  return updatedCode;
}

function loadIgnoreList(): Array<{ file: string, exports: string[] }> {
  try {
    const ignoreListPath = path.resolve('scripts/exports-ignore-list.json');
    if (existsSync(ignoreListPath)) {
      const rawData = readFileSync(ignoreListPath, 'utf8');
      const ignoreList = JSON.parse(rawData);
      
      // Clean up the file paths (remove quotes)
      return ignoreList.map((item: any) => ({
        file: item.file.replace(/"/g, ''),
        exports: item.exports
      }));
    }
  } catch (error) {
    console.warn('⚠️  Could not load ignore list, using fallback patterns');
  }
  
  // Fallback to basic patterns if ignore list doesn't exist
  return [
    { file: 'components/ui/', exports: ['*'] }, // Keep all UI components
    { file: 'hooks/', exports: ['use*'] }, // Keep all hooks
  ];
}

function shouldIgnoreExport(filePath: string, exportName: string): boolean {
  const ignoreList = loadIgnoreList();
  
  for (const pattern of ignoreList) {
    if (filePath.includes(pattern.file)) {
      if (pattern.exports.includes(exportName) || 
          pattern.exports.includes('*') ||
          (pattern.exports.some(exp => exp.includes('*')) && 
           exportName.startsWith(pattern.exports.find(exp => exp.includes('*'))?.replace('*', '') || ''))) {
        return true;
      }
    }
  }
  
  return false;
}

function processFile(filePath: string, exports: string[]): boolean {
  try {
    const fullPath = path.resolve(filePath);
    let code = readFileSync(fullPath, 'utf8');
    let hasChanges = false;
    
    console.log(`Processing ${filePath}:`);
    
    for (const exportName of exports) {
      if (shouldIgnoreExport(filePath, exportName)) {
        console.log(`  ⏭️  Ignoring (likely used): ${exportName}`);
        continue;
      }
      
      const originalCode = code;
      code = removeExportFromCode(code, exportName);
      
      if (code !== originalCode) {
        console.log(`  ✓ Removed export from: ${exportName}`);
        hasChanges = true;
      } else {
        console.log(`  ✗ Could not find export pattern for: ${exportName}`);
      }
    }
    
    if (hasChanges) {
      writeFileSync(fullPath, code);
      console.log(`  📝 Updated file: ${filePath}\n`);
      return true;
    } else {
      console.log(`  ⚠️  No changes made to: ${filePath}\n`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npx tsx scripts/remove-unused-exports.ts [options]

Options:
  --dry-run                  Show what would be changed without making changes
  --file=<pattern>           Only process files matching this pattern
  --max-files=<number>       Only process the first N files
  --help, -h                 Show this help

Examples:
  npx tsx scripts/remove-unused-exports.ts --dry-run
  npx tsx scripts/remove-unused-exports.ts --file=error-popup
  npx tsx scripts/remove-unused-exports.ts --max-files=5
  npx tsx scripts/remove-unused-exports.ts --file=ui/button --dry-run
`);
    return;
  }
  
  const dryRun = args.includes('--dry-run');
  const specificFile = args.find(arg => arg.startsWith('--file='))?.split('=')[1];
  const maxFiles = args.find(arg => arg.startsWith('--max-files='))?.split('=')[1];
  
  console.log('🔍 Getting unused exports from ts-unused-exports...\n');
  
  try {
    // Run ts-unused-exports and capture output
    const output = execSync('npx ts-unused-exports tsconfig.json', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    const unusedExports = parseUnusedExports(output);
    
    if (unusedExports.length === 0) {
      console.log('🎉 No unused exports found!');
      return;
    }
    
    console.log(`Found unused exports in ${unusedExports.length} files\n`);
    
    // Filter by specific file if requested
    let filesToProcess = unusedExports;
    if (specificFile) {
      filesToProcess = unusedExports.filter(item => item.filePath.includes(specificFile));
      console.log(`📁 Processing only files matching: ${specificFile}\n`);
    }
    
    // Limit number of files if requested
    if (maxFiles) {
      const limit = parseInt(maxFiles);
      filesToProcess = filesToProcess.slice(0, limit);
      console.log(`📊 Processing only first ${limit} files\n`);
    }
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be modified\n');
      for (const { filePath, exports } of filesToProcess) {
        console.log(`Would process ${filePath}:`);
        for (const exp of exports) {
          console.log(`  - Would remove export from: ${exp}`);
        }
        console.log();
      }
      return;
    }
    
    let totalFilesChanged = 0;
    let totalExportsRemoved = 0;
    
    for (const { filePath, exports } of filesToProcess) {
      // Skip generated files and configuration files
      if (filePath.includes('.gen.') || filePath.includes('config.ts') || filePath.includes('playwright.config.ts')) {
        console.log(`⏭️  Skipping generated/config file: ${filePath}\n`);
        continue;
      }
      
      const success = processFile(filePath, exports);
      if (success) {
        totalFilesChanged++;
        totalExportsRemoved += exports.length;
      }
    }
    
    console.log('📊 Summary:');
    console.log(`  Files changed: ${totalFilesChanged}`);
    console.log(`  Exports converted to internal: ${totalExportsRemoved}`);
    
  } catch (error) {
    // ts-unused-exports returns non-zero exit code when it finds unused exports
    // So we need to handle this case and parse the stderr
    if (error instanceof Error && 'stdout' in error) {
      const output = (error as any).stdout || (error as any).stderr;
      if (output) {
        const unusedExports = parseUnusedExports(output);
        console.log(`Found unused exports in ${unusedExports.length} files\n`);
        
        let totalFilesChanged = 0;
        let totalExportsRemoved = 0;
        
        for (const { filePath, exports } of unusedExports) {
          // Skip generated files and configuration files
          if (filePath.includes('.gen.') || filePath.includes('config.ts') || filePath.includes('playwright.config.ts')) {
            console.log(`⏭️  Skipping generated/config file: ${filePath}\n`);
            continue;
          }
          
          const success = processFile(filePath, exports);
          if (success) {
            totalFilesChanged++;
            totalExportsRemoved += exports.length;
          }
        }
        
        console.log('📊 Summary:');
        console.log(`  Files changed: ${totalFilesChanged}`);
        console.log(`  Exports converted to internal: ${totalExportsRemoved}`);
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
}

// Run main function
main();