/**
 * Stub implementation to prevent errors with Facebook user info processing
 */

// Safe implementation of getUserFbFullName
function getUserFbFullName(element) {
  // If element is null, return a default value
  if (!element) return '';
  
  try {
    return element.getAttribute('content') || '';
  } catch (e) {
    console.log('Error getting user FB info:', e);
    return '';
  }
}

// Safe implementation of addFUserInfo
async function addFUserInfo(payload) {
  // Return the unchanged payload
  return payload;
}

// Export functions if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getUserFbFullName,
    addFUserInfo
  };
} 