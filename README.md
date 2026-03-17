# JSON Schema Test Harness (AJV)

This repository contains a simple test harness for running tests from the official JSON Schema Test Suite using the AJV validator in Node.js.

It supports both **validation tests** and a basic **annotation test harness**, allowing exploration of how JSON Schema test suites are executed in practice.

---

## Purpose

This project was created as part of the qualification task for the **“Unify the Test Suite”** project idea in the JSON Schema community (GSoC).

The goal was to build a simple tool that can:

* load tests from the JSON Schema Test Suite
* compile schemas using AJV
* validate test data against those schemas
* compare actual results with expected results
* print PASS / FAIL output and a summary
* explore annotation-based test execution

---

## Project Structure

Main files in this repository:

* **runner.js** – runs validation test suite
* **annotation-runner.js** – runs annotation test suite
* **package.json** – project dependencies
* **JSON-Schema-Test-Suite/** – cloned official test suite

The harness reads test files directly from the test suite directories.

---

## Requirements

* Node.js (v18+ recommended)
* npm

---

## Installation

Clone the repository and install dependencies:

```
npm install
```

---

## Running the Test Harness

### Validation tests

Run all validation tests:

```
node runner.js
```

Run tests for a specific draft:

```
node runner.js draft2020-12
```

---

### Annotation tests

Run annotation test suite:

```
node annotation-runner.js
```

Run a specific file:

```
node annotation-runner.js core.json
```

---

## Example Output

### Validation

```
Running draft7/maximum.json
PASS draft7/maximum.json :: valid maximum
PASS draft7/maximum.json :: invalid maximum
```

### Annotation

```
=== annotations/tests/unevaluated.json ===
VALID   | unevaluatedProperties with properties
```

---

## Notes

* Some validation tests may fail depending on JSON Schema draft support in AJV.
* Annotation test execution here is a **basic exploration**, not a full implementation of annotation semantics.
* The goal is to understand how test harnesses interact with test structure and execution.

---

## JSON Schema Test Suite

Tests used in this project come from the official repository:

https://github.com/json-schema-org/JSON-Schema-Test-Suite

---

## License

This project is provided for experimentation and demonstration purposes as part of a GSoC qualification task.




