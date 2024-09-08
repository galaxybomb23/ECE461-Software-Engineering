
import { Metrics } from './Metrics';
import { performance } from 'perf_hooks';
import { BusFactor } from './busFactor';
import { Correctness } from './correctness';
import { License } from './license';
import { RampUp } from './rampUp';
import { Maintainability } from './maintainability';
import { assert } from 'console';


export class NetScore extends Metrics {
    // Add a variable to the class
    weights: Array<number> = [19.84, 7.47, 30.69, 42.0];
    netScore: number = -1;
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
        this.busFactor.evaluate();
        this.correctness.evaluate();
        this.license.evaluate();
        this.rampUp.evaluate();
        this.maintainability.evaluate();
        const endTime = performance.now();

        // calculate the net score
        this.netScore = 0;
        this.netScore += this.weights[0] * this.busFactor.busFactor;
        this.netScore += this.weights[1] * this.correctness.correctness;
        this.netScore += this.weights[2] * this.license.license;
        this.netScore += this.weights[3] * this.rampUp.rampUp;
        this.netScore += this.weights[4] * this.maintainability.maintainability;

        assert(this.netScore >= 0 && this.netScore <= 1, 'NetScore out of bounds');

        // calculate the response time
        const elapsedTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds
        this.responseTime = elapsedTime

        return this.netScore;

    }

    toString(): string {
        // Implement the toString method
        return `{"URL":"${this.url}", "NetScore": ${this.netScore}, "NetScore_Latency": ${this.responseTime}, "RampUp": ${this.rampUp.rampUp}, "RampUp_Latency": ${this.rampUp.responseTime}, "Correctness": ${this.correctness.correctness}, "Correctness_Latency": ${this.correctness.responseTime}, "BusFactor": ${this.busFactor.busFactor}, "BusFactor_Latency": ${this.busFactor.responseTime}, "ResponsiveMaintainer": ${this.maintainability.maintainability}, "ResponsiveMaintainer_Latency": ${this.maintainability.responseTime}, "License": ${this.license.license}, "License_Latency": ${this.license.responseTime}}`;
    }
}