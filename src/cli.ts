#!/usr/bin/env node


import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';

//##proprietaries##
import { OCTOKIT } from './Metrics.js';
import { NetScore } from './netScore.js';
//tests
import { BusFactorTest } from './busFactor.js';
import { CorrectnessTest } from './correctness.js';
import { LicenseTest } from './license.js';
// import { MaintainabilityTest } from './maintainability';
import { RampUpTest } from './rampUp.js';
import { NetScoreTest } from './netScore.js';
import { exit } from 'process';


dotenv.config();

async function getGithubUrlFromNpm(npmUrl: string): Promise<string | null> {
    try {
        // Extract package name from npm URL
        const packageName = npmUrl.split('/').pop();
        if (!packageName) return null;

        // Fetch package details from npm registry
        const npmApiUrl = `https://registry.npmjs.org/${packageName}`;
        const response = await axios.get(npmApiUrl);

        // Check if the package has a repository field
        const repoUrl = response.data.repository?.url;
        if (repoUrl && repoUrl.includes('github.com')) {
            // Normalize the URL (remove 'git+', 'ssh://git@', and '.git' if present)
            console.log(`Found GitHub URL for ${npmUrl}: ${repoUrl}`);
            let normalizedUrl = repoUrl.replace(/^git\+/, '').replace(/^ssh:\/\/git@github.com/, 'https://github.com/').replace(/\.git$/, '');
            return normalizedUrl;
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Error fetching GitHub URL for ${npmUrl}:`, error);
        return null;
    }
}





/**
 * Displays the usage information for the CLI.
 */
function showUsage() {
    console.log(`Usage:
    ./run install                   # Install dependencies
    ./run <path/to/file>            # Process URLs from "URL_FILE"
    ./run test                      # Run test suite`);
}

async function runTests() {
    let passedTests = 0;
    let failedTests = 0;
    let results: { passed: number, failed: number }[] = [];
    let apiRemaining: number[] = [];
    console.log('Running tests...');
    console.log('Checking environment variables...');

    // get token from environment variable
    let status = await OCTOKIT.rateLimit.get();
    console.log(`Rate limit status: ${status.data.rate.remaining} remaining out of ${status.data.rate.limit}`);
    apiRemaining.push(status.data.rate.remaining);

    //print warning if rate limit is low
    if (status.data.rate.remaining < 300) {
        console.log('\x1b[1;33mWarning: Rate limit is low. Test Suite uses ~ 250 calls. Consider using a different token.\x1b[0m');
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
    results.push(await NetScoreTest());
    apiRemaining.push((await OCTOKIT.rateLimit.get()).data.rate.remaining);


    //calc used rate limit
    let usedRateLimit = apiRemaining[0] - apiRemaining[apiRemaining.length - 1];
    console.log(`Rate Limit Usage:`);
    console.log(`License Test: ${apiRemaining[0] - apiRemaining[1]}`);
    console.log(`Bus Factor Test: ${apiRemaining[1] - apiRemaining[2]}`);
    console.log(`Correctness Test: ${apiRemaining[2] - apiRemaining[3]}`);
    console.log(`Ramp Up Test: ${apiRemaining[3] - apiRemaining[4]}`);
    console.log(`Net Score Test: ${apiRemaining[4] - apiRemaining[5]}`);
    console.log(`Total Rate Limit Used: ${usedRateLimit}`);

    // Display test results
    results.forEach((result, index) => {
        passedTests += result.passed;
        failedTests += result.failed;
    });

    console.log(`\x1b[1;32mTests Passed: ${passedTests}\x1b[0m`);
    console.log(`\x1b[1;31mTests Failed: ${failedTests}\x1b[0m`);
    console.log('\x1b[1;34mTests complete\x1b[0m');
}

async function processUrls(filePath: string): Promise<void> {
    const urls: string[] = fs.readFileSync(filePath, 'utf-8').split('\n');
    const githubUrls: string[] = [];

    for (const url of urls) {
        if (url.includes('github.com')) {
            // If it's already a GitHub URL, add it to the list
            githubUrls.push(url);
        } else if (url.includes('npmjs.com')) {
            // If it's an npm URL, try to get the GitHub URL
            const githubUrl = await getGithubUrlFromNpm(url);
            if (githubUrl) {
                githubUrls.push(githubUrl);
            }
        }
    }

    // print the github urls
    console.log('GitHub URLs:');
    console.log(githubUrls);

    // // Process each GitHub URL
    // for (const url of githubUrls) {
    //     const netScore = new NetScore(url);
    //     const result = await netScore.evaluate();
    //     console.log(netScore.toString());
    // }
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