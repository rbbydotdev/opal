#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as path from 'path';

interface UnusedExport {
  filePath: string;
  exports: string[];
}

interface BackupFile {
  filePath: string;
  originalContent: string;
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
  // Same patterns as the main script
  const patterns = [
    new RegExp(`^export (const ${exportName}\\s*=.*)$`, 'gm'),
    new RegExp(`^export (function ${exportName}\\s*\\(.*)$`, 'gm'),
    new RegExp(`^export (class ${exportName}\\s*.*)$`, 'gm'),
    new RegExp(`^export (interface ${exportName}\\s*.*)$`, 'gm'),
    new RegExp(`^export (type ${exportName}\\s*.*)$`, 'gm'),
    new RegExp(`^export (enum ${exportName}\\s*.*)$`, 'gm'),
  ];

  let updatedCode = code;
  
  for (const pattern of patterns) {
    updatedCode = updatedCode.replace(pattern, '$1');
  }
  
  return updatedCode;
}

function temporarilyRemoveExports(unusedExports: UnusedExport[]): BackupFile[] {
  const backups: BackupFile[] = [];
  
  console.log('🔄 Temporarily removing exports...\n');
  
  for (const { filePath, exports } of unusedExports) {
    try {
      const fullPath = path.resolve(filePath);
      const originalContent = readFileSync(fullPath, 'utf8');
      let modifiedContent = originalContent;
      
      // Skip generated/config files
      if (filePath.includes('.gen.') || filePath.includes('config.ts') || filePath.includes('playwright.config.ts')) {
        continue;
      }
      
      backups.push({ filePath: fullPath, originalContent });
      
      for (const exportName of exports) {
        modifiedContent = removeExportFromCode(modifiedContent, exportName);
      }
      
      writeFileSync(fullPath, modifiedContent);
      console.log(`  Modified: ${filePath}`);
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
    }
  }
  
  return backups;
}

function restoreFiles(backups: BackupFile[]): void {
  console.log('\n🔄 Restoring original files...\n');
  
  for (const { filePath, originalContent } of backups) {
    try {
      writeFileSync(filePath, originalContent);
      console.log(`  Restored: ${filePath}`);
    } catch (error) {
      console.error(`❌ Error restoring ${filePath}:`, error);
    }
  }
}

function runTypeScriptCheck(): string {
  try {
    execSync('npm run dev:tsc', { encoding: 'utf8', stdio: 'pipe' });
    return ''; // No errors
  } catch (error: any) {
    return error.stdout || error.stderr || '';
  }
}

function parseTypeScriptErrors(output: string): Array<{ file: string, exportName: string, error: string }> {
  const errors: Array<{ file: string, exportName: string, error: string }> = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    // Match patterns like: src/file.ts(2,10): error TS2459: Module '"@/path"' declares 'ExportName' locally, but it is not exported.
    const notExportedMatch = line.match(/([^(]+)\([^)]+\): error TS2459: Module[^']*'([^']+)'[^']*declares '([^']+)'[^']*not exported/);
    if (notExportedMatch) {
      const [, errorFile, importPath, exportName] = notExportedMatch;
      errors.push({
        file: importPath.replace('@/', 'src/'),
        exportName,
        error: line.trim()
      });
      continue;
    }
    
    // Match patterns like: src/file.ts(8,3): error TS2724: '"@/path"' has no exported member named 'ExportName'.
    const noMemberMatch = line.match(/([^(]+)\([^)]+\): error TS2724:[^']*'([^']+)'[^']*no exported member named '([^']+)'/);
    if (noMemberMatch) {
      const [, errorFile, importPath, exportName] = noMemberMatch;
      errors.push({
        file: importPath.replace('@/', 'src/'),
        exportName,
        error: line.trim()
      });
      continue;
    }
    
    // Match patterns like: src/file.ts(1,11): error TS2300: Duplicate identifier 'ExportName'.
    const duplicateMatch = line.match(/([^(]+)\([^)]+\): error TS2300: Duplicate identifier '([^']+)'/);
    if (duplicateMatch) {
      const [, errorFile, exportName] = duplicateMatch;
      // This might indicate the export is actually needed
      errors.push({
        file: errorFile,
        exportName,
        error: line.trim()
      });
      continue;
    }
  }
  
  return errors;
}

function generateIgnoreList(tsErrors: Array<{ file: string, exportName: string, error: string }>): Array<{ file: string, exports: string[] }> {
  const ignoreMap = new Map<string, Set<string>>();
  
  for (const { file, exportName } of tsErrors) {
    if (!ignoreMap.has(file)) {
      ignoreMap.set(file, new Set());
    }
    ignoreMap.get(file)!.add(exportName);
  }
  
  return Array.from(ignoreMap.entries()).map(([file, exports]) => ({
    file,
    exports: Array.from(exports)
  }));
}

function main() {
  console.log('🔍 Generating ignore list via TypeScript analysis...\n');
  
  let backups: BackupFile[] = [];
  
  try {
    // Step 1: Get unused exports
    console.log('📋 Getting unused exports list...');
    const output = execSync('npx ts-unused-exports tsconfig.json', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    const unusedExports = parseUnusedExports(output);
    console.log(`Found ${unusedExports.length} files with unused exports\n`);
    
    // Step 2: Temporarily remove exports
    backups = temporarilyRemoveExports(unusedExports);
    
    // Step 3: Run TypeScript check
    console.log('🔍 Running TypeScript analysis...');
    const tsOutput = runTypeScriptCheck();
    
    // Step 4: Parse errors to find what's actually needed
    const tsErrors = parseTypeScriptErrors(tsOutput);
    console.log(`Found ${tsErrors.length} TypeScript errors indicating needed exports\n`);
    
    // Step 5: Generate ignore list
    const ignoreList = generateIgnoreList(tsErrors);
    
    // Step 6: Save ignore list
    const ignoreListPath = path.resolve('scripts/exports-ignore-list.json');
    writeFileSync(ignoreListPath, JSON.stringify(ignoreList, null, 2));
    
    console.log('📝 Generated ignore list:');
    for (const { file, exports } of ignoreList) {
      console.log(`  ${file}: ${exports.join(', ')}`);
    }
    
    console.log(`\n💾 Saved ignore list to: ${ignoreListPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`  Total files with unused exports: ${unusedExports.length}`);
    console.log(`  Files with exports that need to be preserved: ${ignoreList.length}`);
    console.log(`  Total exports to ignore: ${ignoreList.reduce((sum, item) => sum + item.exports.length, 0)}`);
    
  } catch (error: any) {
    // Handle case where ts-unused-exports returns error code
    if (error.stdout) {
      const unusedExports = parseUnusedExports(error.stdout);
      console.log(`Found ${unusedExports.length} files with unused exports\n`);
      
      backups = temporarilyRemoveExports(unusedExports);
      
      console.log('🔍 Running TypeScript analysis...');
      const tsOutput = runTypeScriptCheck();
      
      const tsErrors = parseTypeScriptErrors(tsOutput);
      console.log(`Found ${tsErrors.length} TypeScript errors indicating needed exports\n`);
      
      const ignoreList = generateIgnoreList(tsErrors);
      
      const ignoreListPath = path.resolve('scripts/exports-ignore-list.json');
      writeFileSync(ignoreListPath, JSON.stringify(ignoreList, null, 2));
      
      console.log('📝 Generated ignore list:');
      for (const { file, exports } of ignoreList) {
        console.log(`  ${file}: ${exports.join(', ')}`);
      }
      
      console.log(`\n💾 Saved ignore list to: ${ignoreListPath}`);
    } else {
      console.error('❌ Error:', error);
    }
  } finally {
    // Always restore files
    if (backups.length > 0) {
      restoreFiles(backups);
    }
  }
}

// Run main function
main();