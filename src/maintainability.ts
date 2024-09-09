import { Metrics } from "./Metrics.js";

/**
 * Represents a class for calculating and evaluating the maintainability of a repository.
 */
export class Maintainability extends Metrics {
    public maintainability: number = -1;

    constructor(url: string) {
        super(url);
    }

    /**
     * Retrieves the owner and repository name from a given GitHub URL.
     * @param url - The GitHub URL to extract the owner and repository name from.
     * @returns A promise that resolves to an object containing the owner and repository name.
     * @throws {Error} If the provided URL is invalid.
     */
    private async getRepoData(url: string): Promise<{ owner: string; repo: string }> {
        const regex = /https:\/\/github\.com\/([^/]+)\/([^/]+)/;
        const match = url.match(regex);
        if (!match) throw new Error("Invalid GitHub URL");

        return { owner: match[1], repo: match[2] };
    }

    /**
     * Calculates the maintainability score for a given repository.
     * 
     * @param owner - The owner of the repository.
     * @param repo - The name of the repository.
     * @returns The maintainability score, a number between 0 and 1. A higher score indicates better maintainability.
     *          Returns -1 if there was an error fetching the issues.
     */
    private async calculateMaintainability(owner: string, repo: string): Promise<number> {
        try {
            // Fetch the most recent 100 issues for the repository
            const { data: issues } = await this.octokit.issues.listForRepo({
                owner: owner,
                repo: repo,
                state: "all",      // Fetch both open and closed issues
                per_page: 25,     // Limit to 25 issues
                sort: "created",   // Sort by creation date
                direction: "desc"  // Get the most recent issues first
            });

            let totalResolutionTime = 0;
            let resolvedIssuesCount = 0;

            // Calculate resolution time for each closed issue
            for (const issue of issues) {
                if (issue.state === "closed" && issue.closed_at) {
                    const createdAt = new Date(issue.created_at).getTime();
                    const closedAt = new Date(issue.closed_at).getTime();
                    const resolutionTime = (closedAt - createdAt) / (1000 * 60 * 60 * 24); // Convert to days

                    totalResolutionTime += resolutionTime;
                    resolvedIssuesCount++;
                }
            }

            // Calculate average resolution time in days
            const averageResolutionTimeDays = resolvedIssuesCount > 0 ? totalResolutionTime / resolvedIssuesCount : 0;

            if (averageResolutionTimeDays > 14) {
                return 0;
            }

            return 1 - (averageResolutionTimeDays / 14);
        } catch (error) {
            console.error("Error fetching issues:", error);

            return -1;
        }
    }

    /**
     * Evaluates the maintainability of the code.
     * 
     * @returns A promise that resolves to the maintainability score.
     */
    public async evaluate(): Promise<number> {
        const rateLimitStatus = await this.getRateLimitStatus();

        if (rateLimitStatus.remaining === 0) {
            const resetTime = new Date(rateLimitStatus.reset * 1000).toLocaleTimeString();
            console.log(`Rate limit exceeded. Try again after ${resetTime}`);

            return -1;
        }

        const startTime = performance.now();

        const { owner, repo } = await this.getRepoData(this.url);
        this.maintainability = await this.calculateMaintainability(owner, repo);

        const endTime = performance.now();
        const elapsedTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds
        this.responseTime = elapsedTime;

        return this.maintainability;
    }
}
