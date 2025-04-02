/**
 * Silent Edge Runtime Warnings
 * 
 * This script suppresses specific Edge Runtime warnings from the Next.js build output
 * by monkey-patching the console.warn function.
 */

// Original console.warn function
const originalWarn = console.warn;

// List of warning messages to suppress
const suppressedWarnings = [
  'A Node.js API is used (process.version',
  'A Node.js API is used (process.nextTick',
  'which is not supported in the Edge Runtime',
];

// Monkey-patch console.warn to filter out specific warnings
console.warn = function(...args) {
  // Check if the warning message contains any of the suppressed patterns
  const shouldSuppress = suppressedWarnings.some(pattern => 
    args.length > 0 && 
    typeof args[0] === 'string' && 
    args[0].includes(pattern)
  );

  // If the warning should be suppressed, don't output it
  if (!shouldSuppress) {
    originalWarn.apply(console, args);
  }
};

console.log('✅ Edge Runtime warnings silenced successfully!'); 