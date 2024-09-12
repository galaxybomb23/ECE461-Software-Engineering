
import { performance } from "perf_hooks";
import { Metrics, logger } from "./Metrics.js";
import { ASSERT_EQ, ASSERT_LT } from "./testUtils.js";

/**
 * Represents a class that calculates the bus factor of a repository.
 * The bus factor is a measure of the number of developers that need to be hit by a bus (or leave the project) 
 * before it becomes infeasible to maintain the codebase.
 */
export class BusFactor extends Metrics {
    public busFactor: number = -1;
    /**
     * Constructs a new instance of the CLI class.
     * @param url - The URL to connect to.
     */
    constructor(url: string) {
        super(url);
    }

    /**
     * Asynchronously evaluates the bus factor of a repository.
     * 
     * @returns A promise that resolves to the calculated bus factor.
     */
    public async evaluate(): Promise<number> {
        const rateLimitStatus = await this.getRateLimitStatus();

        if (rateLimitStatus.remaining === 0) {
            const resetTime = new Date(rateLimitStatus.reset * 1000).toLocaleTimeString();
            console.log(`Rate limit exceeded. Try again after ${resetTime}`);
            return -1;
        }

        const startTime = performance.now();
        const commitData = await this.getCommitData(this.owner, this.repo);
        this.busFactor = this.calculateBusFactor(commitData);
        const endTime = performance.now();
        const elapsedTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds
        this.responseTime = elapsedTime;

        return this.busFactor;
    }


    /**
     * Retrieves commit data for a given owner and repository.
     * 
     * @param owner - The owner of the repository.
     * @param repo - The name of the repository.
     * @returns A Promise that resolves to a Map containing the commit data, where the keys are the authors' 
     *          usernames and the values are the number of commits made by each author.
     */
    private async getCommitData(owner: string, repo: string): Promise<Map<string, number>> {
        const commitCounts = new Map<string, number>();
        let page = 1;
        while (true && page < 10) {
            const { data: commits } = await this.octokit.repos.listCommits({
                owner,
                repo,
                per_page: 100,
                page,
            });

            commits.forEach((commit) => {
                const author = commit.author?.login;
                if (author) {
                    commitCounts.set(author, (commitCounts.get(author) || 0) + 1);
                }
            });

            if (commits.length < 100) {
                break;
            }
            page++;
        }

        // print total number of commits 📝
        // console.log("Total number of commits:", Array.from(commitCounts.values()).reduce((a, b) => a + b, 0));
        // console.log("Commit data:", commitCounts);

        return commitCounts;
    }

    /**
     * Calculates the bus factor based on the commit data.
     * 
     * @param commitData - A map containing the number of commits for each contributor.
     * @returns The calculated bus factor.
     */
    private calculateBusFactor(commitData: Map<string, number>): number {
        const totalCommits = Array.from(commitData.values()).reduce((a, b) => a + b, 0);
        const sortedContributors = Array.from(commitData.entries()).sort((a, b) => b[1] - a[1]);

        let commitSum = 0;
        let i = 0;
        while (commitSum < totalCommits * 0.5) {
            commitSum += sortedContributors[i][1];
            i++;
        }

        const rawBusFactor = i / sortedContributors.length;
        const adjustedBusFactor = rawBusFactor * 2;

        return Math.min(adjustedBusFactor);
    }
}

export async function BusFactorTest(): Promise<{ passed: number, failed: number }> {
    let testsPassed = 0;
    let testsFailed = 0;
    let busFactors: BusFactor[] = [];

    //first test
    let busFactor = new BusFactor('https://github.com/cloudinary/cloudinary_npm');
    let result = await busFactor.evaluate();
    ASSERT_EQ(result, 0.15, "Bus Factor Test 1") ? testsPassed++ : testsFailed++;
    ASSERT_LT(busFactor.responseTime, 0.004, "Bus Factor Response Time Test 1") ? testsPassed++ : testsFailed++;
    logger.debug(`Response time: ${busFactor.responseTime.toFixed(6)}s`);
    busFactors.push(busFactor);


    //second test
    busFactor = new BusFactor('https://github.com/nullivex/nodist');
    result = await busFactor.evaluate();
    ASSERT_EQ(result, 0.07, "Bus Factor Test 2") ? testsPassed++ : testsFailed++;
    ASSERT_LT(busFactor.responseTime, 0.002, "Bus Factor Response Time Test 2") ? testsPassed++ : testsFailed++;
    logger.debug(`Response time: ${busFactor.responseTime.toFixed(6)}s`);
    busFactors.push(busFactor);

    //third test
    busFactor = new BusFactor('https://github.com/lodash/lodash');
    result = await busFactor.evaluate();
    ASSERT_EQ(result, 0.02, "Bus Factor Test 3") ? testsPassed++ : testsFailed++;
    ASSERT_LT(busFactor.responseTime, 0.084, "Bus Factor Response Time Test 3") ? testsPassed++ : testsFailed++;
    logger.debug(`Response time: ${busFactor.responseTime.toFixed(6)}s`);
    busFactors.push(busFactor);

    return { passed: testsPassed, failed: testsFailed };
}
