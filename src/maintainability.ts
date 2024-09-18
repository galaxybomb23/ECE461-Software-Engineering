import { Metrics, logger } from "./Metrics.js";
import { ASSERT_LT, ASSERT_NEAR } from './testUtils.js';

/**
 * Represents a class for calculating and evaluating the maintainability of a repository.
 */
export class Maintainability extends Metrics {
    public maintainability: number = -1;

    /**
     * Constructs an instance of the class.
     * 
     * @param nativeUrl - The native URL to be used.
     * @param url - The URL to be used.
     */
    constructor(nativeUrl: string, url: string) {
        super(nativeUrl, url);
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
            logger.error("Error fetching issues:", error);
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
        logger.debug(`Evaluating Maintainability for ${this.url}`);
        const startTime = performance.now();

        this.maintainability = await this.calculateMaintainability(this.owner, this.repo);

        const endTime = performance.now();
        const elapsedTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds
        this.responseTime = elapsedTime;

        logger.debug(`Maintainability: ${this.maintainability}`);
        return this.maintainability;
    }
}

/**
 * Perform a series of maintainability tests on a set of URLs.
 * 
 * This function evaluates the maintainability of various repositories by comparing
 * the calculated maintainability score against an expected value within a specified threshold.
 * It also checks if the response time of the maintainability evaluation is below a certain limit.
 * 
 * @returns {Promise<{ passed: number, failed: number }>} An object containing the number of passed and failed tests.
 * 
 * @example
 * const result = await MaintainabilityTest();
 * console.log(`Tests Passed: ${result.passed}, Tests Failed: ${result.failed}`);
 */
export async function MaintainabilityTest(): Promise<{ passed: number, failed: number }> {
    let testsPassed = 0;
    let testsFailed = 0;
    let maintainabilityTests: Maintainability[] = [];

    const url_to_expected_score = [
        { url: "https://github.com/nullivex/nodist", expectedMaintainability: 0.01 },
        { url: "https://github.com/cloudinary/cloudinary_npm", expectedMaintainability: 0.8 },
        { url: "https://github.com/lodash/lodash", expectedMaintainability: 0.23 },
    ];

    for (const test of url_to_expected_score) {
        let maintainability = new Maintainability(test.url, test.url);
        let result = await maintainability.evaluate();
        let threshold: number = 0.1

        ASSERT_NEAR(result, test.expectedMaintainability, threshold, `Maintainability Test for ${test.url}`) ? testsPassed++ : testsFailed++;
        ASSERT_LT(maintainability.responseTime, 0.004, `Maintainability Response_Time Test for ${test.url}`) ? testsPassed++ : testsFailed++;
        logger.debug(`Maintainability Response time: ${maintainability.responseTime.toFixed(6)}s`);
        maintainabilityTests.push(maintainability);
    }

    return { passed: testsPassed, failed: testsFailed };
}