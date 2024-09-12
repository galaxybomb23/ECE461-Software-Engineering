
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

dotenv.config();
// Access the token value
const githubToken = process.env.API_TOKEN;
if (!githubToken) {
    throw new Error('API_TOKEN is not defined in the .env file');
}
export let OCTOKIT: Octokit = new Octokit({ auth: githubToken, });


/**
 * Represents a Metrics class.
 * @abstract
 */
export abstract class Metrics {
    public LOG_LEVEL: number = Number(process.env.LOG_LEVEL) || 2;
    public LOG_FILE: string = process.env.LOG_FILE || 'logs/run.log';
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
        if (!match) throw new Error("Invalid GitHub URL");
        return { owner: match[1], repo: match[2] };
    }

    abstract evaluate(): Promise<number>;

    public async getRateLimitStatus() {
        const rateLimit = await OCTOKIT.rateLimit.get();
        return rateLimit.data.rate;
    }
}