import { Octokit } from '@octokit/rest';
import { createLogger, format, Logger, transports } from 'winston';
import dotenv from 'dotenv';

dotenv.config();
// Access the token value
export const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) {
    throw new Error('GITHUB_TOKEN is not defined in the .env file');
}
export let logLevel = process.env.LOG_LEVEL?.toLowerCase();
if (!logLevel) {
    // logLevel = 'info';
    throw new Error('LOG_LEVEL is not defined in the .env file')
}
else{
    if (typeof(logLevel) === 'string'){
        logLevel = logLevel.toLowerCase();
           switch(logLevel){
            case "0":
                logLevel = 'error';
                break;
            case "1":
                logLevel = 'debug';
                break;
            case "2":
                logLevel = 'info';
                break;
           }
        }
        else{
            throw new Error('LOG_LEVEL is not a string in the .env file')
        }
            
            
}
export let logFile = process.env.LOG_FILE;
if (!logFile) {
    // logFile  = "logs/run.log";
    throw new Error('LOG_FILE is not defined in the .env file')
}

// Create an Octokit instance
export let OCTOKIT: Octokit = new Octokit({ auth: githubToken, });

// Create a logger
export let logger: Logger = createLogger({
    level: logLevel,
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
    ),
    transports: [
        // Log to console
        new transports.File({ filename: logFile, options: { flags: 'a' } }) // Log to a file and append
    ],
});

/**
 * Represents a Metrics class.
 * @abstract
 */
export abstract class Metrics {
    public responseTime: number = 0;
    public octokit: Octokit = OCTOKIT;

    protected url: string;
    protected owner: string;
    protected repo: string;
    public NativeURL: string;

    constructor(NativeURL: string, url: string) {
        this.url = url;
        this.NativeURL = NativeURL;
        const { owner, repo } = this.getRepoData(this.url);
        this.owner = owner;
        this.repo = repo;
    }

    private getRepoData(url: string): { owner: string; repo: string } {
        const regex = /github\.com\/([^/]+)\/([^/]+)/;
        const match = url.match(regex);
        if (!match) {
            logger.error(`${url} is an invalid Github URL`);
            throw new Error(`Invalid GitHub URL ${url}`);
        }
        return { owner: match[1], repo: match[2] };
    }

    abstract evaluate(): Promise<number>;

    public async getRateLimitStatus() {
        const rateLimit = await OCTOKIT.rateLimit.get();
        return rateLimit.data.rate;
    }
}