import { configure, Configuration, getLogger } from 'log4js';
import * as config from 'config';

const initialized = false;

/**
 * ロガーを初期化する。
 */
export function initializeLogger():void {
    const loggerConfig = config.get('log4js');
    configure(<Configuration>loggerConfig);
}

export function logTrace(message: string) {
    const logger = getLogger('trace');
    const system = getLogger('system');
    logger.trace(message);
    system.trace(message);
}

export function logInfo(message: string) {
    const logger = getLogger('info');
    const system = getLogger('system');
    logger.info(message);
    system.info(message);
    
}

export function logWarn(message: string) {
    const logger = getLogger('warn');
    const system = getLogger('system');
    logger.warn(message);
    system.warn(message);
}

export function logError(message: string) {
    const logger = getLogger('error');
    const system = getLogger('system');
    logger.error(message);
    system.error(message);
}

