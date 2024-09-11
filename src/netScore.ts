
import { Metrics } from './Metrics.js';
import { performance } from 'perf_hooks';
import { BusFactor } from './busFactor.js';
import { Correctness } from './correctness.js';
import { License } from './license.js';
import { RampUp } from './rampUp.js';
import { Maintainability } from './maintainability.js';
import { assert } from 'console';
import { ASSERT_EQ, ASSERT_LT, ASSERT_NEAR } from './testUtils.js';


export class NetScore extends Metrics {
    // Add a variable to the class
    weights: Array<number> = [19.84, 7.47, 30.69, 42.0];
    netScore: number = 0;
    busFactor: BusFactor;
    correctness: Correctness;
    license: License;
    rampUp: RampUp;
    maintainability: Maintainability;


    constructor(
        url: string,
    ) {
        super(url);
        this.busFactor = new BusFactor(url);
        this.correctness = new Correctness(url);
        this.license = new License(url);
        this.rampUp = new RampUp(url);
        this.maintainability = new Maintainability(url);

    }

    async evaluate(): Promise<number> {
        // generate the metrics
        const startTime = performance.now();
        await Promise.all([
            this.busFactor.evaluate(),
            this.correctness.evaluate(),
            this.license.evaluate(),
            this.rampUp.evaluate(),
            this.maintainability.evaluate()
        ]);
        const endTime = performance.now();

        // calculate the net score
        //if any metric is -1 then netscore is 0
        if (this.busFactor.busFactor == -1 || this.correctness.correctness == -1 || this.license.license == -1 || this.rampUp.rampUp == -1 || this.maintainability.maintainability == -1) {
            this.netScore = 0;
            return this.netScore;
        }
        else {
            this.netScore = 0;
            for (let i = 0; i < this.weights.length; i++) {
                this.netScore += this.weights[i] * [this.busFactor.busFactor, this.correctness.correctness, this.rampUp.rampUp, this.maintainability.maintainability][i] / 100;
            }
        }

        //check if netscore is between 0 and 1
        if (this.netScore < 0 || this.netScore > 1) {

            console.log(`NetScore out of bounds: ${this.netScore}`);

            //print the metrics
            console.log(`BusFactor: ${this.busFactor.busFactor}`);
            console.log(`Correctness: ${this.correctness.correctness}`);
            console.log(`RampUp: ${this.rampUp.rampUp}`);
            console.log(`Maintainability: ${this.maintainability.maintainability}`);
            console.log(`License: ${this.license.license
                }`);
        }
        // assert(this.netScore >= 0 && this.netScore <= 1, 'NetScore out of bounds');

        // calculate the response time
        const elapsedTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds
        this.responseTime = elapsedTime

        return this.netScore;
    }

    toString(): string {
        return `{
            "URL": "${this.url}",
            "NetScore": ${this.netScore.toFixed(3)},
            "NetScore_Latency": ${this.responseTime.toFixed(3)},
            "RampUp": ${this.rampUp.rampUp.toFixed(3)},
            "RampUp_Latency": ${this.rampUp.responseTime.toFixed(3)},
            "Correctness": ${this.correctness.correctness.toFixed(3)},
            "Correctness_Latency": ${this.correctness.responseTime.toFixed(3)},
            "BusFactor": ${this.busFactor.busFactor.toFixed(3)},
            "BusFactor_Latency": ${this.busFactor.responseTime.toFixed(3)},
            "ResponsiveMaintainer": ${this.maintainability.maintainability.toFixed(3)},
            "ResponsiveMaintainer_Latency": ${this.maintainability.responseTime.toFixed(3)},
            "License": ${this.license.license.toFixed(3)},
            "License_Latency": ${this.license.responseTime.toFixed(3)}
        }`.replace(/\s+/g, ' ')
        .replace(/\s*{\s*/g, '{')
        .replace(/\s*}\s*/g, '}')
        .replace(/"\s*:\s*/g, '":')
        .replace(/\s*"\s*/g, '"')
        .replace(/,(?!\s)/g, ', ');
    }
}

export async function NetScoreTest(): Promise<{ passed: number, failed: number }> {
    let testsPassed = 0;
    let testsFailed = 0;
    let netScores: NetScore[] = [];

    //first test
    let netScore = new NetScore('https://github.com/cloudinary/cloudinary_npm');
    let result = await netScore.evaluate();
    ASSERT_NEAR(result, 0.65, .05, "Net Score Test 1") ? testsPassed++ : testsFailed++;
    ASSERT_LT(netScore.responseTime, 0.02, "Net Score Response Time Test 1") ? testsPassed++ : testsFailed++;
    console.log(`Response time: ${netScore.responseTime.toFixed(6)}s\n`);
    netScores.push(netScore);

    //second test
    netScore = new NetScore('https://github.com/nullivex/nodist');
    result = await netScore.evaluate();
    ASSERT_NEAR(result, 0.20, .05, "Net Score Test 2") ? testsPassed++ : testsFailed++;
    ASSERT_LT(netScore.responseTime, 0.02, "Net Score Response Time Test 2") ? testsPassed++ : testsFailed++;
    console.log(`Response time: ${netScore.responseTime.toFixed(6)}s\n`);
    netScores.push(netScore);

    //third test
    netScore = new NetScore('https://github.com/lodash/lodash');
    result = await netScore.evaluate();
    ASSERT_NEAR(result, 0.42, .05, "Net Score Test 3") ? testsPassed++ : testsFailed++;
    ASSERT_LT(netScore.responseTime, 0.02, "Net Score Response Time Test 3") ? testsPassed++ : testsFailed++;
    console.log(`Response time: ${netScore.responseTime.toFixed(6)}s\n`);
    netScores.push(netScore);

    return { passed: testsPassed, failed: testsFailed };
}
