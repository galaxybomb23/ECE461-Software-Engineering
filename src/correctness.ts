import { Metrics } from './Metrics.js';
import { performance } from 'perf_hooks';
import { ASSERT_EQ } from './testUtils.js';

/**
 * Represents a class that calculates the correctness of a repository based on its issues data.
 * @extends Metrics
 */
export class Correctness extends Metrics {
    public correctness: number = -1;

    /**
     * Constructs a new instance of the class.
     * @param url The URL to be passed to the constructor.
     */
    constructor(url: string) {
        super(url);
    }

    /**
     * Asynchronously evaluates the correctness of the code.
     * 
     * @returns A promise that resolves to the correctness value.
     */
    public async evaluate(): Promise<number> {
        const rateLimitStatus = await this.getRateLimitStatus();

        if (rateLimitStatus.remaining === 0) {
            const resetTime = new Date(rateLimitStatus.reset * 1000).toLocaleTimeString();
            console.log(`Rate limit exceeded. Try again after ${resetTime}`);
            return -1;
        }

        // Calculate response time of evaluate method
        const startTime = performance.now();
        this.correctness = await this.calculateCorrectness();
        const endTime = performance.now();
        this.responseTime = Number(endTime - startTime) / 1e6;

        return this.correctness;
    }

    /**
     * Calculates the correctness of the system based on the number of open bug issues and total open issues.
     * 
     * @returns A Promise that resolves to a number representing the correctness of the system.
     *          Returns 1 if there are no issues reported.
     *          Returns a value between 0 and 1 representing the correctness percentage if there are issues.
     *          Returns -1 if there was an error calculating the correctness.
     */
    private async calculateCorrectness(): Promise<number> {
        try {
            // Fetch the issues data from the repository
            const { openBugIssues, totalOpenIssues } = await this.fetchIssuesData();

            // Check if total issues count is zero to prevent division by zero
            if (totalOpenIssues === 0) {
                return 1; // Assuming correctness is perfect if there are no issues
            }

            // Calculate correctness
            const correctness = 1 - (openBugIssues / totalOpenIssues);
            return correctness;
        } catch (error) {
            console.error('Error calculating correctness:', error);
            return -1;
        }
    }

    /**
     * Fetches the issues data from the repository.
     * 
     * @returns A promise that resolves to an object containing the number of open bug issues 
     *          and the total number of open issues.
     * @throws {Error} If the repository URL is invalid or if there is an error fetching the data.
     */
    private async fetchIssuesData(): Promise<{ openBugIssues: number; totalOpenIssues: number }> {
        try {
            const owner = this.owner;
            const repo = this.repo;
        
            const { data } = await this.octokit.issues.listForRepo({
                owner,
                repo,
                state: 'all',
                labels: 'bug', // Filter by bug label
                per_page: 100
            });

            // Count open and total issues
            const openBugIssues = data.filter(issue => issue.state === 'open').length;
            const totalOpenIssues = data.length;

            return { openBugIssues, totalOpenIssues };
        } catch (error) {
            console.error('Error fetching issues data:', error);
            throw error;
        }
    }
}

/**
 * Performs correctness tests on the given URLs and returns the number of tests passed and failed.
 *
 * @returns A promise that resolves to an object containing the number of tests passed and failed.
 */
export async function CorrectnessTest(): Promise<{ passed: number, failed: number }> {
    let testsPassed = 0;
    let testsFailed = 0;

    // Test 1
    const correctness = new Correctness('https://github.com/cloudinary/cloudinary_npm');
    const result: number = await correctness.evaluate();
    const expectedValue = 0.933333333; // Expected value is 0.93333...
    ASSERT_EQ(result, expectedValue, 'Correctness test 1') ? testsPassed++ : testsFailed++;
    console.log(`Response time: ${correctness.responseTime.toFixed(6)}s\n`);

    // Test 2
    const correctness2 = new Correctness('https://github.com/nullivex/nodist');
    const result2: number = await correctness2.evaluate();
    const expectedValue2 = 0.90909091; // Expected value is 0.90909091
    ASSERT_EQ(result2, expectedValue2, 'Correctness test 2') ? testsPassed++ : testsFailed++;
    console.log(`Response time: ${correctness2.responseTime.toFixed(6)}s\n`);

    // Test 3
    const correctness3 = new Correctness('https://github.com/Coop8/Coop8');
    const result3: number = await correctness3.evaluate();
    const expectedValue3 = 1; // Expected value is 1
    ASSERT_EQ(result3, expectedValue3, 'Correctness test 3') ? testsPassed++ : testsFailed++;
    console.log(`Response time: ${correctness3.responseTime.toFixed(6)}s\n`);

    return { passed: testsPassed, failed: testsFailed };
}