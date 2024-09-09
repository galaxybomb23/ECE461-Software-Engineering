import { Metrics } from "./Metrics.js";
import { ASSERT_EQ, ASSERT_LT, ASSERT_NEAR } from './testUtils.js';


export class Maintainability extends Metrics {

    public maintainability: number = -1;

    constructor(
        url: string,
    ) {
        super(url);
    }

    private async getRepoData(url: string): Promise<{ owner: string; repo: string }> {
        const regex = /https:\/\/github\.com\/([^/]+)\/([^/]+)/;
        const match = url.match(regex);
        if (!match) throw new Error("Invalid GitHub URL");

        return { owner: match[1], repo: match[2] };
    }

    private async calculateMaintainability(owner: string, repo: string): Promise<number> {
        try {
            // Fetch the most recent 100 issues for the repository
            const { data: issues } = await this.octokit.issues.listForRepo({
                owner: owner,
                repo: repo,
                state: "all",      // Fetch both open and closed issues
                per_page: 25,      // Limit to 25 issues
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


export async function MaintainabilityTest(): Promise<{ passed: number, failed: number }> {
    let testsPassed = 0;
    let testsFailed = 0;
    let maintainabilityTests: Maintainability[] = [];

    const url_to_expected_score = [
        { url: "https://github.com/nullivex/nodist", expectedMaintainability: 0.01 },
        { url: "https://github.com/cloudinary/cloudinary_npm", expectedMaintainability: 0.8 },
        { url: "https://github.com/lodash/lodash", expectedMaintainability: 0.6 },
    ];

    for (const test of url_to_expected_score) {

        let maintainability = new Maintainability(test.url);
        let result = await maintainability.evaluate();

        let threshold: number = 0.1
        ASSERT_NEAR(result, test.expectedMaintainability, threshold, `Maintainability Test for ${test.url}`) ? testsPassed++ : testsFailed++;
        
        ASSERT_LT(maintainability.responseTime, 0.004, `Maintainability Response_Time Test for ${test.url}`) ? testsPassed++ : testsFailed++;

        console.log(`Maintainability Response time: ${maintainability.responseTime.toFixed(6)}s\n`);

        maintainabilityTests.push(maintainability);
    }

    return { passed: testsPassed, failed: testsFailed };
}