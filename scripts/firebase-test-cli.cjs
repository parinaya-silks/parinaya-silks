// Test-only bootstrap: Firebase CLI's debug file must not serialize inherited
// environment values when it launches the emulator test command.
const { logger } = require('firebase-tools/lib/logger.js');
const {EmulatorLogger}=require('firebase-tools/lib/emulator/emulatorLogger.js');
const originalLog=EmulatorLogger.prototype.log;
EmulatorLogger.prototype.log=function(type,message,data){
  const safe=typeof message==='string'?message.replace(/([?&]oobCode=)[^&\s]+/g,'$1[redacted]'):message;
  return originalLog.call(this,type,safe,data);
};
const originalDebug = logger.debug.bind(logger);
logger.debug = (message, ...metadata) => {
  if (typeof message === 'string' && message.includes(' with environment ')) return logger;
  return originalDebug(message, ...metadata);
};
require('firebase-tools/lib/bin/firebase.js');
