const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "JSON-Schema-Test-Suite", "annotations", "tests")

const fileArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"))
const isQuiet = process.argv.includes("--quiet")
const dialectArg = process.argv
  .find((arg) => arg.startsWith("--dialect="))
  ?.split("=")[1]

const targetRelease = Number.parseInt(dialectArg || "2020", 10)
const targetDialectUri = "https://json-schema.org/draft/2020-12/schema"

let hyperjump = null

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

async function initValidator() {
  if (hyperjump) return hyperjump

  const draft = await import("@hyperjump/json-schema/draft-2020-12")
  const experimental = await import("@hyperjump/json-schema/experimental")

  hyperjump = {
    validate: draft.validate,
    registerSchema: draft.registerSchema,
    unregisterSchema: draft.unregisterSchema,
    AnnotationsPlugin: experimental.AnnotationsPlugin,
    getKeywordName: experimental.getKeywordName,
    FLAG: "FLAG",
  }

  return hyperjump
}

function read(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"))
  } catch (e) {
    console.log("read error:", e.message)
    return null
  }
}

function injectDialect(schema) {
  if (typeof schema === "boolean" || !schema || typeof schema !== "object") {
    return schema
  }

  if (Object.prototype.hasOwnProperty.call(schema, "$schema")) {
    return schema
  }

  return { ...schema, $schema: targetDialectUri }
}

function isCompatible(compatibility) {
  if (!compatibility || typeof compatibility !== "string") return true

  const constraints = compatibility
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)

  for (const constraint of constraints) {
    if (constraint.startsWith("<=")) {
      const max = Number.parseInt(constraint.slice(2), 10)
      if (!Number.isFinite(max) || targetRelease > max) return false
      continue
    }

    if (constraint.startsWith("=")) {
      const exact = Number.parseInt(constraint.slice(1), 10)
      if (!Number.isFinite(exact) || targetRelease !== exact) return false
      continue
    }

    const min = Number.parseInt(constraint, 10)
    if (!Number.isFinite(min) || targetRelease < min) return false
  }

  return true
}

function normalizeSchemaLocation(absoluteKeywordLocation, keyword, rootSchemaUri) {
  return normalizeSchemaLocationWithIds(
    absoluteKeywordLocation,
    keyword,
    rootSchemaUri,
    new Map()
  )
}

function normalizeSchemaLocationWithIds(
  absoluteKeywordLocation,
  keyword,
  rootSchemaUri,
  idPointerMap
) {
  if (typeof absoluteKeywordLocation !== "string") return ""

  try {
    const keywordUri = new URL(absoluteKeywordLocation)
    const rootUri = new URL(rootSchemaUri)
    const keywordDocUri = `${keywordUri.origin}${keywordUri.pathname}${keywordUri.search}`
    const pointerPrefix = idPointerMap.get(keywordDocUri)
    const isRootDocument =
      keywordUri.origin === rootUri.origin &&
      keywordUri.pathname === rootUri.pathname &&
      keywordUri.search === rootUri.search

    let fragment = keywordUri.hash || "#"
    if (fragment.startsWith("#/")) {
      const parts = fragment.slice(2).split("/")
      const last = parts[parts.length - 1]
      if (decodeURIComponent(last || "") === keyword) {
        parts.pop()
      }
      fragment = parts.length ? `#/${parts.join("/")}` : "#"
    }

    if (pointerPrefix && !isRootDocument) {
      if (fragment === "#") {
        return pointerPrefix
      }

      if (fragment.startsWith("#/")) {
        return pointerPrefix === "#"
          ? fragment
          : `${pointerPrefix}${fragment.slice(1)}`
      }
    }

    if (isRootDocument) return fragment

    return `${keywordUri.origin}${keywordUri.pathname}${keywordUri.search}${fragment}`
  } catch {
    return absoluteKeywordLocation
  }
}

function escapePointerSegment(segment) {
  return encodeURI(String(segment).replace(/~/g, "~0").replace(/\//g, "~1"))
}

function joinPointer(base, segment) {
  const part = `/${escapePointerSegment(segment)}`
  return base === "" ? part : `${base}${part}`
}

function stripHash(urlValue) {
  const uri = new URL(urlValue)
  return `${uri.origin}${uri.pathname}${uri.search}`
}

function collectIdPointerMap(schema, baseUri) {
  const map = new Map()

  function walk(node, pointer, currentBase) {
    if (!node || typeof node !== "object") return

    let nextBase = currentBase
    if (typeof node.$id === "string") {
      try {
        const resolved = new URL(node.$id, currentBase).href
        nextBase = stripHash(resolved)
        map.set(nextBase, pointer ? `#${pointer}` : "#")
      } catch {}
    }

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        walk(node[i], joinPointer(pointer, i), nextBase)
      }
      return
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === "$id") continue
      walk(value, joinPointer(pointer, key), nextBase)
    }
  }

  map.set(stripHash(baseUri), "#")
  walk(schema, "", baseUri)
  return map
}

function getKeywordNameSafe(keywordId, getKeywordName) {
  let keywordName
  try {
    keywordName = getKeywordName(targetDialectUri, keywordId)
  } catch {}

  if (keywordName) return keywordName

  const asText = String(keywordId || "")

  try {
    const uri = new URL(asText)
    if (uri.hash.startsWith("#x-")) return uri.hash.slice(1)
    if (uri.hash.startsWith("#")) return uri.hash.slice(1)
  } catch {}

  return asText.split("/").pop() || asText
}

function toAnnotationMap(annotations, rootSchemaUri, getKeywordName, idPointerMap) {
  const map = new Map()

  for (const item of annotations || []) {
    const instanceLocationRaw = item.instanceLocation || ""
    const instanceLocation =
      instanceLocationRaw === "#"
        ? ""
        : instanceLocationRaw.startsWith("#/")
        ? instanceLocationRaw.slice(1)
        : instanceLocationRaw
    const keywordId = item.keyword || ""

    const keywordName = getKeywordNameSafe(keywordId, getKeywordName)

    const schemaLocation = normalizeSchemaLocationWithIds(
      item.absoluteKeywordLocation,
      keywordName,
      rootSchemaUri,
      idPointerMap
    )

    const key = `${instanceLocation}\u0000${keywordName}`
    if (!map.has(key)) {
      map.set(key, {})
    }

    const bucket = map.get(key)
    bucket[schemaLocation] = item.annotation
  }

  return map
}

function sameExpected(actual, expected) {
  const actualObj = actual && typeof actual === "object" ? actual : {}
  const expectedObj = expected && typeof expected === "object" ? expected : {}

  const actualKeys = Object.keys(actualObj)
  const expectedKeys = Object.keys(expectedObj)
  if (actualKeys.length !== expectedKeys.length) return false

  for (const key of expectedKeys) {
    if (!Object.prototype.hasOwnProperty.call(actualObj, key)) return false
    if (JSON.stringify(actualObj[key]) !== JSON.stringify(expectedObj[key])) {
      return false
    }
  }

  return true
}

function assertionsPass(assertions, annotationMap) {
  if (!Array.isArray(assertions) || assertions.length === 0) return true

  for (const assertion of assertions) {
    const location = assertion.location || ""
    const keyword = assertion.keyword || ""
    const expected = assertion.expected || {}
    const key = `${location}\u0000${keyword}`
    const actual = annotationMap.get(key) || {}

    if (!sameExpected(actual, expected)) {
      return false
    }
  }

  return true
}

async function runSingleTest(
  validate,
  getKeywordName,
  rootSchemaUri,
  idPointerMap,
  test,
  fallback,
  fileStats
) {
  summary.tests++
  fileStats.total++

  const desc = test.description || fallback || "no description"

  let result = false
  let annotations = []

  try {
    const plugin = new hyperjump.AnnotationsPlugin()
    const output = await validate(rootSchemaUri, test.instance, {
      outputFormat: hyperjump.FLAG,
      plugins: [plugin],
    })

    result = Boolean(output && output.valid)
    annotations = plugin.annotations || []
  } catch (e) {
    summary.runtimeErrors++
    fileStats.runtimeErrors++
    print(`runtime error | ${desc}`)
    return
  }

  const hasValid = Object.prototype.hasOwnProperty.call(test, "valid")
  const hasAssertions = Array.isArray(test.assertions)

  let passed
  if (hasAssertions) {
    const annotationMap = toAnnotationMap(
      annotations,
      rootSchemaUri,
      getKeywordName,
      idPointerMap
    )
    passed = assertionsPass(test.assertions, annotationMap)
  } else if (hasValid) {
    passed = result === test.valid
  } else {
    passed = Boolean(result)
  }

  if (passed) {
    summary.pass++
    fileStats.pass++
    print(`pass | ${desc}`)
  } else {
    summary.fail++
    fileStats.fail++
    print(`fail | ${desc}`)
  }
}

async function runCase(file, caseIndex, testCase, fileStats) {
  summary.cases++

  if (!isCompatible(testCase.compatibility)) return

  const { validate, registerSchema, unregisterSchema, getKeywordName } = hyperjump
  const rootSchemaUri = `https://test-harness.local/annotations/${file}/suite/${caseIndex}/schema`
  const caseSchema = injectDialect(testCase.schema)
  const idPointerMap = collectIdPointerMap(caseSchema, rootSchemaUri)

  try {
    await registerSchema(caseSchema, rootSchemaUri)

    const external =
      testCase.externalSchemas && typeof testCase.externalSchemas === "object"
        ? Object.entries(testCase.externalSchemas)
        : []

    for (const [uri, schema] of external) {
      await registerSchema(injectDialect(schema), uri)
    }
  } catch (e) {
    summary.compileErrors++
    fileStats.compileErrors++
    const desc = testCase.description || "no description"
    print(`compile error | ${desc}`)
    return
  }

  const tests = Array.isArray(testCase.tests) ? testCase.tests : []

  for (const t of tests) {
    await runSingleTest(
      validate,
      getKeywordName,
      rootSchemaUri,
      idPointerMap,
      t,
      testCase.description,
      fileStats
    )
  }

  try {
    unregisterSchema(rootSchemaUri)
  } catch {}

  const external =
    testCase.externalSchemas && typeof testCase.externalSchemas === "object"
      ? Object.keys(testCase.externalSchemas)
      : []
  for (const uri of external) {
    try {
      unregisterSchema(uri)
    } catch {}
  }
}

async function runFile(file) {
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

  for (let i = 0; i < suite.length; i++) {
    await runCase(file, i, suite[i], fileStats)
  }

  console.log(
    `result: ${fileStats.pass}/${fileStats.total} passed | fail: ${fileStats.fail}`
  )
}

console.log("running annotation tests...\n")

async function main() {
  await initValidator()

  const files = fs.readdirSync(root).filter((f) => f.endsWith(".json"))

  for (const f of files) {
    await runFile(f)
  }

  console.log("\nfinal result")
  console.log("files:", summary.files)
  console.log("cases:", summary.cases)
  console.log("tests:", summary.tests)
  console.log("pass:", summary.pass)
  console.log("fail:", summary.fail)
  console.log("compile errors:", summary.compileErrors)
  console.log("runtime errors:", summary.runtimeErrors)
}

main().catch((e) => {
  console.error("fatal error:", e.message)
  process.exitCode = 1
})