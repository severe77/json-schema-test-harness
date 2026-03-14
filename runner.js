const fs = require("fs")
const path = require("path")
const Ajv = require("ajv")

const ajv = new Ajv({ strict: false, allErrors: true })

const testsRoot = path.join(__dirname, "JSON-Schema-Test-Suite", "tests")

// optional CLI argument (ex: node runner.js draft7)
const draft = process.argv[2]

let total = 0
let passed = 0
let failed = 0

const dirs = fs.readdirSync(testsRoot)

for (const dir of dirs) {

  const dirPath = path.join(testsRoot, dir)

  if (!fs.statSync(dirPath).isDirectory()) continue

  // CLI filter
  
  if (draft && dir !== draft) continue

  const files = fs.readdirSync(dirPath)

  for (const file of files) {

    if (!file.endsWith(".json")) continue

    const filePath = path.join(dirPath, file)
    const label = `${dir}/${file}`

    console.log("\nRunning", label)

    let groups

    try {
      groups = JSON.parse(fs.readFileSync(filePath, "utf8"))
    } catch (err) {
      console.log("FAIL", label, ":: could not read file")
      total++
      failed++
      continue
    }

    for (const group of groups) {

      let validate

      try {
        validate = ajv.compile(group.schema)
      } catch (err) {
        console.log("FAIL", label, ":: schema compile error")

        for (const _ of group.tests) {
          total++
          failed++
        }

        continue
      }

      for (const test of group.tests) {

        total++

        const result = validate(test.data)

        if (result === test.valid) {
          passed++
          console.log("PASS", label, "::", test.description)
        } else {
          failed++
          console.log("FAIL", label, "::", test.description)

          if (validate.errors) {
            console.log("  errors:", JSON.stringify(validate.errors))
          }
        }

      }

    }

  }

}

console.log("\nSummary")
console.log("Total:", total)
console.log("Passed:", passed)
console.log("Failed:", failed)