# JSON Schema Test Harness (AJV)

This repository contains a simple test harness for running tests from the official JSON Schema Test Suite using the AJV validator in Node.js.

It supports both validation tests and a basic annotation test harness to explore how the test suite works in practice.

## Purpose

This project was built as part of the **“Unify the Test Suite”** GSoC qualification task.

The goal is to:

- load test cases from the JSON Schema Test Suite  
- compile schemas using AJV  
- validate data against schemas  
- compare expected vs actual results  
- print pass / fail output with a summary  
- explore annotation test execution  

## Requirements

- Node.js (v18+ recommended)  
- npm  

## Structure

- runner.js – validation test runner  
- annotation-runner.js – annotation test runner  
- JSON-Schema-Test-Suite/ – local copy of the test suite  

## Installation and Usage

~~~
npm install

node runner.js
node runner.js draft2020-12

node annotation-runner.js
node annotation-runner.js core.json
~~~

## Notes

- Some validation tests may fail depending on JSON Schema draft support in AJV  
- Annotation tests here are for exploration, not full annotation implementation  
- The focus is on understanding how a test harness works with the test suite  

## Source

https://github.com/json-schema-org/JSON-Schema-Test-Suite

## License

This project is intended for learning and experimentation as part of a GSoC qualification task.