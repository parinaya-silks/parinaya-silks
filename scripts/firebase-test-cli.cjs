// Test-only bootstrap: Firebase CLI's debug file must not serialize inherited
// environment values when it launches the emulator test command.
const { logger } = require('firebase-tools/lib/logger.js');
const originalDebug = logger.debug.bind(logger);
logger.debug = (message, ...metadata) => {
  if (typeof message === 'string' && message.includes(' with environment ')) return logger;
  return originalDebug(message, ...metadata);
};
require('firebase-tools/lib/bin/firebase.js');
