/**
 * Optimized git conflict detection using regex patterns
 * Returns true if any git conflict markers are found in the content
 */
export function hasGitConflictMarkers(content: string): boolean {
  if (!content) return false;
  
  // Use optimized regex patterns for git conflict markers
  const conflictStartPattern = /^<{7}/m;
  const conflictMiddlePattern = /^={7}$/m;
  const conflictEndPattern = /^>{7}/m;
  
  return (
    conflictStartPattern.test(content) ||
    conflictMiddlePattern.test(content) ||
    conflictEndPattern.test(content)
  );
}

/**
 * More thorough conflict detection that checks for complete conflict blocks
 * Returns true only if a complete conflict block (start + middle + end) is found
 */
function hasCompleteGitConflictBlocks(content: string): boolean {
  if (!content) return false;
  
  const lines = content.split('\n');
  let hasStart = false;
  let hasMiddle = false;
  
  for (const line of lines) {
    if (line.startsWith('<<<<<<<')) {
      hasStart = true;
      hasMiddle = false; // Reset middle for new conflict block
    } else if (line === '=======' && hasStart) {
      hasMiddle = true;
    } else if (line.startsWith('>>>>>>>') && hasStart && hasMiddle) {
      return true; // Found complete conflict block
    }
  }
  
  return false;
}

/**
 * Fast initial check for any conflict markers
 * Use this for quick validation before more expensive operations
 */
function mayHaveGitConflicts(content: string): boolean {
  return content.includes('<<<<<<<') || 
         content.includes('=======') || 
         content.includes('>>>>>>>');
}