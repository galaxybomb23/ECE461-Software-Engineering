
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

dotenv.config();
// Access the token value
const githubToken = process.env.API_TOKEN;
if (!githubToken) {
    throw new Error('GITHUB_TOKEN is not defined in the .env file');
}
export let OCTOKIT: Octokit = new Octokit({ auth: githubToken, });


/**
 * Represents a Metrics class.
 * @abstract
 */
export abstract class Metrics {
    public responseTime: number = 0;
    public octokit: Octokit = OCTOKIT;
    protected url: string;

    constructor(url: string) {
        this.url = url;
    }

    abstract evaluate(): Promise<number>;

    public async getRateLimitStatus() {
        const rateLimit = await OCTOKIT.rateLimit.get();
        return rateLimit.data.rate;
    }
}