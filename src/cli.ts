#!/usr/bin/env node


import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv';
import test from 'node:test';
import redline from 'readline';
import fs from 'fs';

//##proprietaries##
import { OCTOKIT, logger } from './Metrics.js';
import { NetScore } from './netScore.js';
//tests
import { BusFactorTest } from './busFactor.js';
import { CorrectnessTest } from './correctness.js';
import { LicenseTest } from './license.js';
import { MaintainabilityTest } from './maintainability.js';
import { RampUpTest } from './rampUp.js';
import { NetScoreTest } from './netScore.js';
import { exit } from 'process';


dotenv.config();

/**
 * Displays the usage information for the CLI.
 */
function showUsage() {
    console.log(`Usage:
    ./run install                   # Install dependencies
    ./run <path/to/file>            # Process URLs from "URL_FILE"
    ./run test                      # Run test suite`);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
    let passedTests = 0;
    let failedTests = 0;
    let results: { passed: number, failed: number }[] = [];
    let apiRemaining: number[] = [];
    logger.info('Running tests...');
    logger.info('Checking environment variables...');

    // get token from environment variable
    let status = await OCTOKIT.rateLimit.get();
    logger.debug(`Rate limit status: ${status.data.rate.remaining} remaining out of ${status.data.rate.limit}`);
    apiRemaining.push(status.data.rate.remaining);

    //print warning if rate limit is low
    if (status.data.rate.remaining < 300) {
        logger.warn('Warning: Rate limit is low. Test Suite uses ~ 250 calls. Consider using a different token.');
    }

    // Run tests
    results.push(await LicenseTest());
    apiRemaining.push((await OCTOKIT.rateLimit.get()).data.rate.remaining);
    results.push(await BusFactorTest());
    apiRemaining.push((await OCTOKIT.rateLimit.get()).data.rate.remaining);
    results.push(await CorrectnessTest());
    apiRemaining.push((await OCTOKIT.rateLimit.get()).data.rate.remaining);
    results.push(await RampUpTest());
    apiRemaining.push((await OCTOKIT.rateLimit.get()).data.rate.remaining);
    results.push(await MaintainabilityTest());
    apiRemaining.push((await OCTOKIT.rateLimit.get()).data.rate.remaining);
    results.push(await NetScoreTest());
    apiRemaining.push((await OCTOKIT.rateLimit.get()).data.rate.remaining);


    //calc used rate limit 📝
    let usedRateLimit = apiRemaining[0] - apiRemaining[apiRemaining.length - 1];
    logger.debug(`Rate Limit Usage:`);
    logger.debug(`License Test: ${apiRemaining[0] - apiRemaining[1]}`);
    logger.debug(`Bus Factor Test: ${apiRemaining[1] - apiRemaining[2]}`);
    logger.debug(`Correctness Test: ${apiRemaining[2] - apiRemaining[3]}`);
    logger.debug(`Ramp Up Test: ${apiRemaining[3] - apiRemaining[4]}`);
    logger.debug(`Maintainability Test: ${apiRemaining[4] - apiRemaining[5]}`);
    logger.debug(`Net Score Test: ${apiRemaining[5] - apiRemaining[6]}`);
    logger.debug(`Total Rate Limit Used: ${usedRateLimit}`);

    // Display test results
    results.forEach((result, index) => {
        passedTests += result.passed;
        failedTests += result.failed;
    });

    logger.info(`Tests Passed: ${passedTests}`);
    logger.info(`Tests Failed: ${failedTests}`);
    logger.info("Tests complete");

    if (failedTests / (passedTests + failedTests) > 0.05) {      //if more than 5% of the tests fail, exit with error
        logger.error('Error: More than 5% of tests failed. Exiting with error code 1');
        await sleep(1000);
        exit(1);
    }
    await sleep(1000);
    exit(0);
}

// Placeholder function for processing URLs
function processUrls(urlFile: string) {
    logger.info(`Processing URLs from file: ${urlFile}`);
    // Implement URL processing logic here
}

/**
 * The main function. Handles command line arguments and executes the appropriate functions.
 */
function main() {
    const argv = yargs(hideBin(process.argv))
        .command('test', 'Run test suite', {}, () => {
            runTests();
        })
        .command('$0 <file>', 'Process URLs from a file', (yargs) => {
            yargs.positional('file', {
                describe: 'Path to the file containing URLs',
                type: 'string'
            });
        }, (argv) => {
            let filename: string = argv.file as string;
            if (fs.existsSync(filename)) {
                processUrls(filename);
            } else {
                console.error(`File not found: ${argv.file}`);
                showUsage();
                process.exit(1);
            }
        })
        .help()
        .alias('help', 'h')
        .argv;
}
main();