import fs from "node:fs";

const readJson = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
const sources = readJson("../content/sources.json");
const catalog = readJson("../content/syllabus-catalog.json");
const schema = readJson("../content/content.schema.json");
const bookCatalog = readJson("../content/book-catalog.json");
const class10 = readJson("../content/odisha-class10-hsc-2026-27.json");

const errors = [];
const sourceIds = new Set(sources.sources.map((source) => source.id));
if (sourceIds.size !== sources.sources.length) errors.push("Duplicate source IDs in sources.json.");

for (const source of sources.sources) {
  if (!source.id || !source.url || !/^https:\/\//.test(source.url)) errors.push(`Invalid source record: ${source.id || "(missing id)"}`);
  if (!source.status) errors.push(`Source ${source.id} is missing a status.`);
}

if (!Array.isArray(bookCatalog.entries)) errors.push("book-catalog.json must contain an entries array.");
const bookKeys = new Set();
for (const entry of bookCatalog.entries || []) {
  const key = [entry.board, entry.class, entry.subject].join(":");
  if (bookKeys.has(key)) errors.push("Duplicate book inventory entry: " + key);
  bookKeys.add(key);
  if (!entry.sourceId || !sourceIds.has(entry.sourceId)) errors.push("Book inventory entry " + key + " references unknown sourceId.");
  if (!/^https:\/\//.test(entry.sourceUrl || "")) errors.push("Book inventory entry " + key + " has invalid sourceUrl.");
  if (!Array.isArray(entry.titles) || entry.titles.length === 0) errors.push("Book inventory entry " + key + " must list at least one title.");
  if (!entry.sourceStatus || !entry.reuseNote) errors.push("Book inventory entry " + key + " must disclose source and reuse status.");
}
if (class10.board !== "ODISHA_BOARD" || class10.class !== 10 || class10.qualification !== "HSC") errors.push("Odisha Class X source record must retain the Odisha Board/HSC identity.");
if (!class10.sourceId || !sourceIds.has(class10.sourceId)) errors.push("Odisha Class X source record references unknown sourceId.");
if (!["partial_review_required", "in_review", "verified", "published"].includes(class10.extractionStatus)) errors.push("Invalid extractionStatus in Odisha Class X source record.");
if (!Array.isArray(class10.subjects)) errors.push("Odisha Class X record must contain a subjects array.");
for (const subject of class10.subjects || []) {
  if (!subject.subject || !Array.isArray(subject.terms)) errors.push("Each Odisha Class X subject must have a name and terms array.");
  for (const term of subject.terms || []) {
    if (!term.term || !Array.isArray(term.topics)) errors.push("Invalid term structure for " + (subject.subject || "unknown subject") + ".");
    for (const topic of term.topics || []) if (!topic.category || !topic.title) errors.push("Topic missing category/title in " + (subject.subject || "unknown subject") + ".");
  }
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
console.log("Curriculum content validation passed: " + sources.sources.length + " official source records, " + catalog.coverage.length + " board/class coverage records, " + bookCatalog.entries.length + " textbook inventory entries. Odisha Class X extraction status: " + class10.extractionStatus + ".");
