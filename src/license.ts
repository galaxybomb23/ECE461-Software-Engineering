
import * as git from 'isomorphic-git';
import * as path from 'path';
import http from 'isomorphic-git/http/node/index.cjs';
import * as fs from 'fs';
import { performance } from 'perf_hooks';
import { Metrics } from './Metrics';
import { ASSERT_EQ } from './testUtils';

/**
 * Represents a class that calculates the license compatibility of a repository based on its license information.
 * @extends Metrics
 */
export class License extends Metrics {
    // Add a variable to the class
    public license: number = -1;
    constructor(
        url: string,
    ) {
        super(url);

    }

    // Helper function to clone the repository
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

    // Helper function to check license compatibility
    private checkLicenseCompatibility(licenseText: string): number {
        const compatibleLicenses = [
            'LGPL-2.1',
            'LGPL-2.1-only',
            'LGPL-2.1-or-later',
            'GPL-2.0',
            'GPL-2.0-only',
            'GPL-2.0-or-later',
            'MIT',
            'BSD-2-Clause',
            'BSD-3-Clause',
            'Apache-2.0',
            'MPL-1.1',
            // Add more compatible licenses here
        ];

        // Simple regex to find the license type in the text
        const licenseRegex = new RegExp(compatibleLicenses.join('|'), 'i');
        return licenseRegex.test(licenseText) ? 1 : 0;
    }

    // Helper function to extract license information from README or LICENSE file
    private async extractLicenseInfo(cloneDir: string): Promise<string | null> {
        let licenseInfo: string | null = null;

        // Case-insensitive file search for README (e.g., README.md, README.MD)
        const readmeFiles = fs.readdirSync(cloneDir).filter(file =>
            file.match(/^readme\.(md|txt)?$/i)
        );

        if (readmeFiles.length > 0) {
            const readmePath = path.join(cloneDir, readmeFiles[0]);
            const readmeContent = fs.readFileSync(readmePath, 'utf-8');
            const licenseSection = readmeContent.match(/##\s*(Licence|Legal)(\s|\S)*/i);
            if (licenseSection) {
                licenseInfo = licenseSection[0];
            }
        }

        // Case-insensitive file search for LICENSE (e.g., LICENSE.txt, license.md)
        const licenseFiles = fs.readdirSync(cloneDir).filter(file =>
            file.match(/^licen[sc]e(\..*)?$/i)
        );

        if (licenseFiles.length > 0) {
            const licenseFilePath = path.join(cloneDir, licenseFiles[0]);
            const licenseContent = fs.readFileSync(licenseFilePath, 'utf-8');
            if (licenseInfo) {
                licenseInfo += '\n' + licenseContent;
            } else {
                licenseInfo = licenseContent;
            }
        }

        return licenseInfo;
    }

    // The main evaluate function to implement the license check
    public async evaluate(): Promise<number> {

        const cloneDir = path.join('/tmp', 'repo-clone');
        let startTime = performance.now();
        try {
            await this.cloneRepository(cloneDir);

            startTime = performance.now();
            const licenseInfo = await this.extractLicenseInfo(cloneDir);
            // console.log('\x1b[34mLicense info:\n', licenseInfo, '\x1b[0m'); //📝
            if (licenseInfo) {
                this.license = this.checkLicenseCompatibility(licenseInfo);
            } else {
                this.license = -1; // No license information found
            }
        } catch (error) {
            console.error('Error evaluating license:', error);
            this.license = -1; // On error, assume incompatible license
        } finally {
            // Clean up: remove the cloned repository
            fs.rmSync(cloneDir, { recursive: true, force: true });
        }
        const endTime = performance.now();
        this.responseTime = Number(endTime - startTime) / 1e6; // Convert to milliseconds
        return this.license;
    }
}


export async function LicenseTest(): Promise<{ passed: number, failed: number }> {
    let testsPassed = 0;
    let testsFailed = 0;
    let licenses: License[] = [];

    //first test
    let license = new License('https://github.com/cloudinary/cloudinary_npm');
    let result = await license.evaluate();
    ASSERT_EQ(result, 1, "License Test 1") ? testsPassed++ : testsFailed++;
    console.log(`Response time: ${license.responseTime.toFixed(6)}s\n`);
    licenses.push(license);

    //second test
    license = new License('https://github.com/nullivex/nodist');
    result = await license.evaluate();
    ASSERT_EQ(result, 1, "License Test 2") ? testsPassed++ : testsFailed++;
    console.log(`Response time: ${license.responseTime.toFixed(6)}s\n`);
    licenses.push(license);

    //third test
    license = new License('https://github.com/lodash/lodash');
    result = await license.evaluate();
    ASSERT_EQ(result, 1, "License Test 3") ? testsPassed++ : testsFailed++;
    console.log(`Response time: ${license.responseTime.toFixed(6)}s\n`);
    licenses.push(license);

    return { passed: testsPassed, failed: testsFailed };
}
