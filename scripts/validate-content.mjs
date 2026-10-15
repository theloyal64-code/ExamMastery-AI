import fs from "node:fs";

const readJson = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
const sources = readJson("../content/sources.json");
const catalog = readJson("../content/syllabus-catalog.json");
const schema = readJson("../content/content.schema.json");

const errors = [];
const sourceIds = new Set(sources.sources.map((source) => source.id));
if (sourceIds.size !== sources.sources.length) errors.push("Duplicate source IDs in sources.json.");

for (const source of sources.sources) {
  if (!source.id || !source.url || !/^https:\/\//.test(source.url)) errors.push(`Invalid source record: ${source.id || "(missing id)"}`);
  if (!source.status) errors.push(`Source ${source.id} is missing a status.`);
}

const expected = new Set();
for (const board of catalog.scope.boards) {
  for (const classLevel of catalog.scope.classes) expected.add(`${board}:${classLevel}`);
}
const seen = new Set();
for (const item of catalog.coverage) {
  const key = `${item.board}:${item.class}`;
  if (seen.has(key)) errors.push(`Duplicate coverage entry: ${key}`);
  seen.add(key);
  if (!expected.has(key)) errors.push(`Unexpected coverage entry: ${key}`);
  if (!["not_verified", "source_found", "in_review", "verified", "published"].includes(item.verificationStatus)) {
    errors.push(`Invalid verification status for ${key}`);
  }
  if (!Array.isArray(item.subjects)) errors.push(`Subjects must be an array for ${key}`);
  for (const sourceId of item.sourceIds) {
    if (!sourceIds.has(sourceId)) errors.push(`Unknown source ID ${sourceId} referenced by ${key}`);
  }
  if (["verified", "published"].includes(item.verificationStatus) && !item.academicSession) {
    errors.push(`Verified entry ${key} must specify academicSession`);
  }
}
for (const key of expected) if (!seen.has(key)) errors.push(`Missing coverage entry: ${key}`);

if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") errors.push("Unexpected content schema draft.");
if (errors.length) {
  console.error("Curriculum content validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Curriculum content validation passed: ${sources.sources.length} official source records, ${catalog.coverage.length} board/class coverage records. No syllabus entries are falsely marked verified.`);
