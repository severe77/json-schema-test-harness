const fs = require("fs");
const path = require("path");
const Ajv2020 = require("ajv/dist/2020");

const testsRoot = path.join(__dirname, "JSON-Schema-Test-Suite", "annotations", "tests");


const onlyFile = process.argv[2];

let stats = {
  filesRead: 0,
  testCases: 0,
  testsRun: 0,
  valid: 0,
  invalid: 0,
  compileErrors: 0,
  runtimeErrors: 0,
};

function createAjv() {
  return new Ajv2020({
    strict: false,
    allErrors: true,
    validateSchema: false,
    messages: true,
  });
}

function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.log("READ ERROR:", err.message);
    return null;
  }
}

function registerExternalSchemas(ajv, externalSchemas) {
  if (!externalSchemas || typeof externalSchemas !== "object") return;

  for (const [uri, schema] of Object.entries(externalSchemas)) {
    try {
      ajv.addSchema(schema, uri);
    } catch (_) {
     
    }
  }
}

function runTest(validate, test, fallbackDescription) {
  stats.testsRun++;

  const description =
    test.description || fallbackDescription || "(no description)";

  let result;
  try {
    result = validate(test.instance);
  } catch (err) {
    stats.runtimeErrors++;
    console.log(`RUNTIME ERROR | ${description}`);
    console.log("  ", err.message);
    return;
  }

  if (result) {
    stats.valid++;
    console.log(`VALID   | ${description}`);
  } else {
    stats.invalid++;
    console.log(`INVALID | ${description}`);
  }
}

function runTestCase(testCase) {
  stats.testCases++;

  const ajv = createAjv();
  registerExternalSchemas(ajv, testCase.externalSchemas);

  let validate;
  try {
    validate = ajv.compile(testCase.schema);
  } catch (err) {
    stats.compileErrors++;
    const desc = testCase.description || "(no description)";
    console.log(`COMPILE ERROR: ${desc}`);
    console.log("  ", err.message);
    return;
  }

  const tests = Array.isArray(testCase.tests) ? testCase.tests : [];

  for (const test of tests) {
    runTest(validate, test, testCase.description);
  }
}

function runFile(file) {
  if (onlyFile && file !== onlyFile) return;

  const filePath = path.join(testsRoot, file);
  const label = `annotations/tests/${file}`;

  stats.filesRead++;
  console.log(`\n=== ${label} ===`);

  const parsed = loadJSON(filePath);
  if (!parsed) return;

  const suite = Array.isArray(parsed.suite) ? parsed.suite : [];

  for (const testCase of suite) {
    runTestCase(testCase);
  }
}



console.log("Running annotation test harness...\n");

const files = fs
  .readdirSync(testsRoot)
  .filter((name) => name.endsWith(".json"));

for (const file of files) {
  runFile(file);
}

console.log("\nSummary");
console.log("Files read:", stats.filesRead);
console.log("Test cases:", stats.testCases);
console.log("Tests run:", stats.testsRun);
console.log("Valid:", stats.valid);
console.log("Invalid:", stats.invalid);
console.log("Compile errors:", stats.compileErrors);
console.log("Runtime errors:", stats.runtimeErrors);