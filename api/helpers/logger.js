const logger = require('log4js').getLogger();

logger.level = process.env.LOG || 'trace';

function Trace(message) {
  logger.trace(message);
}

function Debug(message) {
  logger.debug(message);
}

function Info(message) {
  logger.info(message);
}

function Warn(message) {
  logger.warn(message);
}

function Err(message) {
  logger.error(message);
}

function Fatal(message) {
  logger.fatal(message);
}

function TraceHeadder(method, params, file) {
  try {
  const obj = {};
  let i = 0;
  params.forEach((element) => {
    if (element) {
      obj[i] = JSON.stringify(element).substring(0, 100);
    }
    i += 1;
  });
  
  if (file !== undefined) {
    logger.trace(`[[ENTERING ${method} ${file} WITH PARAMS ${JSON.stringify(obj)}]]`);
  } else {
    logger.trace(`[[ENTERING ${method} WITH PARAMS ${JSON.stringify(obj)}]]`);
  }
  } catch (e) {
    logger.error(`ERROR LOGGING: ${e}`);
  }
}

module.exports = {
  Trace,
  Debug,
  Info,
  Warn,
  Err,
  Fatal,
  TraceHeadder,
};
