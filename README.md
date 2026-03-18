# JSON Schema Test Harness

This repository contains a test harness for running tests from the official JSON Schema Test Suite in Node.js.

It includes:

- a validation runner based on AJV
- an annotation runner using Hyperjump JSON Schema to evaluate annotation assertions

## Purpose

This project was built as part of the “Unify the Test Suite” GSoC qualification task.

The goal is to:

- load test cases from the JSON Schema Test Suite  
- compile and execute test cases  
- compare expected vs actual results  
- print pass / fail output with a summary  
- run annotation assertion checks based on the annotations suite  

## Requirements

- Node.js (v18+ recommended)  
- npm  

## Structure

- runner.js – validation test runner  
- annotation-runner.js – annotation assertion test runner  
- JSON-Schema-Test-Suite – local copy of the test suite  

## Installation and Usage

~~~
npm install

node runner.js
node runner.js draft2020-12

node annotation-runner.js
node annotation-runner.js core.json
node annotation-runner.js --dialect=2020
node annotation-runner.js core.json --dialect=2020 --quiet
~~~

## Notes

- Validation tests and annotation tests follow different execution models.
- The annotation runner evaluates assertions (`location`, `keyword`, `expected`) defined in the annotation test suite.
- Annotations are collected using the Hyperjump JSON Schema implementation and compared against expected assertion values.
- Test cases may define a `compatibility` field, which is used to filter tests based on the selected dialect.
- When `valid` is present and no assertions exist, the validation result is compared against `valid`.
- When assertions are present, pass/fail is determined by comparing collected annotations with expected values.
- Output format is kept consistent as `pass | description` and `fail | description`.

## Source

https://github.com/json-schema-org/JSON-Schema-Test-Suite

## License

This project is intended for learning and experimentation as part of a GSoC qualification task.