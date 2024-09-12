import { Octokit } from '@octokit/rest';
import { createLogger, format, Logger, transports } from 'winston';
import dotenv from 'dotenv';
import { log } from 'node:console';

dotenv.config();

const githubToken = process.env.API_TOKEN;
if (!githubToken) {
    throw new Error('API_TOKEN is not defined in the .env file');
}
const logLevel = process.env.LOG_LEVEL;
if (!logLevel) {
    throw new Error('LOG_LEVEL is not defined in the .env file')
}
const logFile = process.env.LOG_FILE;
if (!logFile) {
    throw new Error('LOG_FILE is not defined in the .env file')
}

export let OCTOKIT: Octokit = new Octokit({ auth: githubToken, });
export let logger: Logger = createLogger({
    level: logLevel,
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
    ),
    transports: [
      new transports.Console(), // Log to console
      new transports.File({ filename: logFile }) // Log to a file
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

    constructor(url: string) {
        this.url = url;
        const { owner, repo } = this.getRepoData(this.url);
        this.owner = owner;
        this.repo = repo;
    }

    private getRepoData(url: string): { owner: string; repo: string } {
        const regex = /https:\/\/github\.com\/([^/]+)\/([^/]+)/;
        const match = url.match(regex);
        if (!match)
        {
            logger.error(`${url} is an valid Github URL`); 
            throw new Error("Invalid GitHub URL");
        }
        return { owner: match[1], repo: match[2] };
    }

    abstract evaluate(): Promise<number>;

    public async getRateLimitStatus() {
        const rateLimit = await OCTOKIT.rateLimit.get();
        return rateLimit.data.rate;
    }
}