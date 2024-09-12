import { Metrics, logger } from './Metrics.js';
import * as git from 'isomorphic-git';
import * as path from 'path';
import http from 'isomorphic-git/http/node/index.cjs';
import * as fs from 'fs';
import { performance } from 'perf_hooks';
import { Metrics } from './Metrics.js';
import { ASSERT_EQ, ASSERT_LT } from './testUtils.js';

/**
 * Represents a class for evaluating the ramp-up score of a repository.
 * Inherits from the Metrics class.
 */
export class RampUp extends Metrics {
    public rampUp: number = -1;

    // Define your metrics
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
     * Clones the repository to the specified directory.
     * 
     * @param cloneDir - The directory where the repository will be cloned.
     * @returns A promise that resolves when the cloning process is complete.
     */
    private async cloneRepository(cloneDir: string): Promise<void> {
        await git.clone({
            fs,
            http,
            dir: cloneDir,
            url: this.url,
            singleBranch: true,
            depth: 1,
        });
    }

    /**
     * Processes the cloned repository to check for the presence of specific metrics.
     * 
     * @param cloneDir - The directory where the repository was cloned.
     */
    private async processRepository(cloneDir: string): Promise<void> {
        const files = fs.readdirSync(cloneDir, { withFileTypes: true });

        for (const file of files) {
            // Traverse the directory structure, recursively if it's a directory
            const filePath = path.join(cloneDir, file.name);
            if (file.isDirectory()) {
                await this.processRepository(filePath);
            }

            // Check each file against the defined metrics
            for (const [key, metric] of Object.entries(this.metrics)) {
                const fileTypeMatches = (file.isDirectory() && metric.fileType === 'dir') || (!file.isDirectory() && metric.fileType === 'file') || metric.fileType === 'either';
                const nameMatches = file.name.toLowerCase().includes(metric.name);

                if (fileTypeMatches && nameMatches) {
                    this.metrics[key].found = true;
                }
            }
        }
    }

    /**
     * Calculates the ramp-up score based on the found metrics.
     */
    private calculateRampUpScore(): number {
        const totalFound = Object.values(this.metrics).reduce((sum, metric) => sum + (metric.found ? 1 : 0), 0);
        const totalMetrics = Object.keys(this.metrics).length;
        return totalFound / totalMetrics;
    }

    /**
     * Evaluates the ramp-up score of the repository.
     * 
     * @returns A promise that resolves to the ramp-up score.
     */
    public async evaluate(): Promise<number> {
        const cloneDir = path.join('/tmp', 'repo-clone-rampUp');
        let startTime = performance.now();

        try {
            await this.cloneRepository(cloneDir);
            await this.processRepository(cloneDir);

            this.rampUp = this.calculateRampUpScore();
        } catch (error) {
            console.error('Error evaluating ramp-up:', error);
            this.rampUp = -1;
        } finally {
            fs.rmSync(cloneDir, { recursive: true, force: true });
        }

        const endTime = performance.now();
        this.responseTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds
        return this.rampUp;
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
        logger.debug(`Ramp Up Response time: ${rampUp.responseTime.toFixed(6)}s`);
        rampUps.push(rampUp);
    }

    return { passed: testsPassed, failed: testsFailed };
}