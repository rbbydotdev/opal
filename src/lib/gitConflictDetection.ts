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