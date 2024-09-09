
import { Metrics } from './Metrics.js';
import { performance } from 'perf_hooks';
import { ASSERT_EQ, ASSERT_LT } from './testUtils.js';

/**
 * Represents a class for evaluating the ramp-up score of a repository.
 * Inherits from the Metrics class.
 */
export class RampUp extends Metrics {
    public rampUp: number = -1;

    // point values
    private metrics: { [key: string]: { name: string; found: boolean, fileType: string } } = {
        example: { name: 'example', found: false, fileType: 'either' },
        test: { name: 'test', found: false, fileType: 'either' },
        readme: { name: 'readme', found: false, fileType: 'file' },
        doc: { name: 'doc', found: false, fileType: 'either' },
        makefile: { name: 'makefile', found: false, fileType: 'file' },
    };

    constructor(url: string) {
        super(url);
    }

    /**
     * Extracts the owner and repo from a GitHub URL.
     * 
     * @param url - The GitHub URL.
     * @returns An object containing the owner and repo.
     * @throws Error if the URL is invalid.
     */
    private extractOwnerRepo(url: string): { owner: string; repo: string } {
        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
            throw new Error("Invalid GitHub URL");
        }

        return {
            owner: match[1],
            repo: match[2],
        };
    }

    /**
     * Asynchronously evaluates the performance of the code.
     * 
     * @returns A promise that resolves to the ramp up value.
     */
    async evaluate(): Promise<number> {
        const startTime = performance.now();
        this.rampUp = await this.printRepoStructure(this.url);
        const endTime = performance.now();
        const elapsedTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds
        this.responseTime = elapsedTime;
        return this.rampUp;
    }

    /* 
       A recursive function to print the repository structure
       and check for the presence of specific folders and files 
    */
    async printRepoStructure(url: string, path: string = ''): Promise<number> {
        try {
            const { owner, repo } = this.extractOwnerRepo(url);
            const response = await this.octokit.repos.getContent({
                owner,
                repo,
                path,
            });

            if (Array.isArray(response.data)) {
                for (const item of response.data) {
                    // Check each metric to see if it is found
                    for (const [key, metric] of Object.entries(this.metrics)) {
                        // Ensure the item type = metric type, or the metric type is 'either'. Then check if the metric name is in the item name
                        if ((item.type === metric.fileType || metric.fileType === 'either') && item.name.toLowerCase().includes(metric.name)) {
                            this.metrics[key].found = true;
                        }
                    }
                    // Recursively check subdirectories after checking each metric
                    if (item.type === 'dir') {
                        await this.printRepoStructure(url, item.path);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching repository structure:", error);
        }

        // Calculate the total score based on the found metrics
        const totalFound = Object.values(this.metrics).reduce((sum, metric) => sum + (metric.found ? 1 : 0), 0);
        const totalMetrics = Object.keys(this.metrics).length

        return (totalFound) / totalMetrics;
    }
}

/**
 * Executes a ramp-up test for a list of URLs and returns the number of tests passed and failed.
 * @returns A promise that resolves to an object containing the number of tests passed and failed.
 */
export async function RampUpTest(): Promise<{ passed: number, failed: number }> {
    let testsPassed = 0;
    let testsFailed = 0;
    let rampUps: RampUp[] = [];

    // Ground truth data
    const groundTruth = [
        { url: "https://github.com/nullivex/nodist", expectedRampUp: 0.4 },
        { url: "https://github.com/cloudinary/cloudinary_npm", expectedRampUp: 0.6 },
        { url: "https://github.com/lodash/lodash", expectedRampUp: 0.4 },
    ];

    // Iterate over the ground truth data and run tests
    for (const test of groundTruth) {
        let rampUp = new RampUp(test.url);
        let result = await rampUp.evaluate();
        ASSERT_EQ(result, test.expectedRampUp, `RampUp Test for ${test.url}`) ? testsPassed++ : testsFailed++;
        ASSERT_LT(rampUp.responseTime, 0.004, `RampUp Response Time Test for ${test.url}`) ? testsPassed++ : testsFailed++;
        console.log(`Ramp Up Response time: ${rampUp.responseTime.toFixed(6)}s\n`);

        rampUps.push(rampUp);
    }

    return { passed: testsPassed, failed: testsFailed };
}