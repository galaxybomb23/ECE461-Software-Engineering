
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

dotenv.config();
// Access the token value
const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) {
    throw new Error('GITHUB_TOKEN is not defined in the .env file');
}
export let OCTOKIT: Octokit = new Octokit({ auth: githubToken, });


/**
 * Represents a Metrics class.
 * @abstract
 */
export abstract class Metrics {
    public responseTime: number;
    public octokit: Octokit = OCTOKIT;

    constructor(
        public url: string,
    ) {
        this.url = url;
        this.responseTime = 0;
    }

    abstract evaluate(): Promise<number>;

    public async getRateLimitStatus() {
        const rateLimit = await OCTOKIT.rateLimit.get();
        return rateLimit.data.rate;
    }
}