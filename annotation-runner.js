const fs = require("fs")
const path = require("path")
const Ajv2020 = require("ajv/dist/2020")

const root = path.join(__dirname, "JSON-Schema-Test-Suite", "annotations", "tests")

const fileArg = process.argv[2]
const isQuiet = process.argv.includes("--quiet")

let summary = {
  files: 0,
  cases: 0,
  tests: 0,
  pass: 0,
  fail: 0,
  compileErrors: 0,
  runtimeErrors: 0,
}

function print(msg) {
  if (!isQuiet) console.log(msg)
}

function makeAjv() {
  return new Ajv2020({
    strict: false,
    allErrors: true,
    validateSchema: false,
  })
}

function read(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"))
  } catch (e) {
    console.log("read error:", e.message)
    return null
  }
}

function addExternal(ajv, ext) {
  if (!ext || typeof ext !== "object") return
  for (const [uri, schema] of Object.entries(ext)) {
    try {
      ajv.addSchema(schema, uri)
    } catch {}
  }
}

function runSingleTest(validate, test, fallback, fileStats) {
  summary.tests++
  fileStats.total++

  const desc = test.description || fallback || "no description"

  let result
  try {
    result = validate(test.instance)
  } catch (e) {
    summary.runtimeErrors++
    fileStats.runtimeErrors++
    print(`runtime error | ${desc}`)
    return
  }

  const expected = test.valid

  if (result === expected) {
    summary.pass++
    fileStats.pass++
    print(`pass | ${desc}`)
  } else {
    summary.fail++
    fileStats.fail++
    print(`fail | ${desc}`)
  }
}

function runCase(testCase, fileStats) {
  summary.cases++

  const ajv = makeAjv()
  addExternal(ajv, testCase.externalSchemas)

  let validate
  try {
    validate = ajv.compile(testCase.schema)
  } catch (e) {
    summary.compileErrors++
    fileStats.compileErrors++
    const desc = testCase.description || "no description"
    print(`compile error | ${desc}`)
    return
  }

  const tests = Array.isArray(testCase.tests) ? testCase.tests : []

  for (const t of tests) {
    runSingleTest(validate, t, testCase.description, fileStats)
  }
}

function runFile(file) {
  if (fileArg && file !== fileArg) return

  const fullPath = path.join(root, file)
  const name = `annotations/${file}`

  summary.files++

  const fileStats = {
    total: 0,
    pass: 0,
    fail: 0,
    compileErrors: 0,
    runtimeErrors: 0,
  }

  console.log(`\n--- ${name} ---`)

  const data = read(fullPath)
  if (!data) return

  const suite = Array.isArray(data.suite) ? data.suite : []

  for (const testCase of suite) {
    runCase(testCase, fileStats)
  }

  console.log(
    `result: ${fileStats.pass}/${fileStats.total} passed | fail: ${fileStats.fail}`
  )
}

console.log("running annotation tests...\n")

const files = fs.readdirSync(root).filter((f) => f.endsWith(".json"))

for (const f of files) {
  runFile(f)
}

console.log("\nfinal result")
console.log("files:", summary.files)
console.log("cases:", summary.cases)
console.log("tests:", summary.tests)
console.log("pass:", summary.pass)
console.log("fail:", summary.fail)
console.log("compile errors:", summary.compileErrors)
console.log("runtime errors:", summary.runtimeErrors)