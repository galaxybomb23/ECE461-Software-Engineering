# ECE 461 Software Engineering Project Phase 1
Created by:
Elijah Jorgensen
Tom O'Donnell
Cooper Rockwell
Rushil Shah

## Table of contents

- [Description](#description)
- [Install](#install)
- [Usage](#usage)
	- [Initial Setup](#initial-setup)
	- [Building](#building)
	- [Cleaning](#cleaning)
	- [Test Bench](#test-bench)
	- [Text file](#run-with-text-file-of-urls)
- [Contribution and License Agreement](#contribution-and-license-agreement)
- [License](#license)

## Description

### ACME Module Evaluator CLI
This repository contains a command-line tool designed to help ACME Corporation’s service engineering teams evaluate and select reliable open-source Node.js modules. The tool analyzes each module based on key metrics such as ramp-up time, correctness, bus factor, maintainer responsiveness, and license compatibility. Results are output in NDJSON format with detailed scores and latencies for each metric.

## Install

``` bash
git clone https://github.com/galaxybomb23/ECE461-Software-Engineering
```

## Usage
All usage for this project is through the `run` executable.

### NOTE for WSL users:
You may encounter the following error when trying to run the checker/run script
```bash
bad interpreter: /bin/bash^M: no such file or directory
```
This is because windows saves the file using CRLF format while WSL expects it to be a LF format. To fix this you need to change the line ending for the file to LF. This can be done in VScode or using `dos2unix` and running the following command:
```bash
dos2unix run test.sh test/URLS.txt checker/one-url.txt 
```

### Initial Setup
`cd` into the cloned directory. 

Create a new file titled `.env` in the root of the repo. Copy and paste the text below into the file. Paste your GitHub API token in the quotes after `GITHUB_TOKEN`. Type the desired log level into the quotes after `LOG_LEVEL`. Paste the path of your log file in the quotes after `LOG_FILE`.

Log levels include:
|Debug|Level| 
|--|--|
|0|Error|
|1|Info|
|2|Debug|

```
GITHUB_TOKEN = "<github_token>"
LOG_LEVEL = "info"
LOG_FILE = "logs/run.log"
```

Run the following command in a terminal while in the root of the repo to install the dependencies:
```bash
./run install
```

### Building
To build the project  run the following command:
```bash
./run build
```

### Cleaning
To clean the project  run the following command:
```bash
./run clean
```

### Test Bench
To run the test bench run the following command:
```bash
./run test
```

### Run with text file of URLs
To run the project with a text file of URLs run the following command:
```bash
./run <path/to/file>
```
and replace the `<path/to/file>` with the path of the text file you are trying to process. Make sure that the text file contains **1 URL per line**.
Ex.)
```
https://github.com/mrdoob/three.js
https://github.com/cloudinary/cloudinary_npm
https://www.npmjs.com/package/express
```

## Contribution and License Agreement
If you contribute code to this project, you are implicitly allowing your code
to be distributed under the MIT license. You are also implicitly verifying that
all code is your original work.

## License
#### Also seen in `LICENSE`
MIT License
Copyright (c) 2024 Elijah Jorgensen
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.