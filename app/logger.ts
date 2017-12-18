import { configure, Configuration, getLogger } from 'log4js';
import * as config from 'config';

const initialized = false;
const loggerConfig = config.get('log4js');
configure(<LoggerConfig>loggerConfig);
export const logger = getLogger((<LoggerConfig>loggerConfig).useLevel);

interface LoggerConfig extends Configuration {
    readonly useLevel: string;
}
