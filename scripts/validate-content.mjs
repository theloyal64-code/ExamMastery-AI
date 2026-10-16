import fs from "node:fs";

const readJson = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
const sources = readJson("../content/sources.json");
const catalog = readJson("../content/syllabus-catalog.json");
const schema = readJson("../content/content.schema.json");
const bookCatalog = readJson("../content/book-catalog.json");
const class10 = readJson("../content/odisha-class10-hsc-2026-27.json");
const class9English = readJson("../content/odisha-class9-hsc-english-2026-27.json");
const class9Practice = readJson("../content/odisha-class9-hsc-english-practice.json");
const class9Maths = readJson("../content/odisha-class9-hsc-mathematics-2026-27.json");
const class9MathsPractice = readJson("../content/odisha-class9-hsc-mathematics-practice.json");
const class9Science = readJson("../content/odisha-class9-hsc-general-science-2026-27.json");
const class9SciencePractice = readJson("../content/odisha-class9-hsc-general-science-practice.json");
const class9SocialScience = readJson("../content/odisha-class9-hsc-social-science-2026-27.json");
const class9SocialSciencePractice = readJson("../content/odisha-class9-hsc-social-science-practice.json");
const learningTracks = readJson("../content/learning-track-catalog.json");
const odishaClass6to8 = readJson("../content/odisha-class6-8-book-inventory.json");

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
if (class9Maths.board !== "ODISHA_BOARD" || class9Maths.class !== 9 || class9Maths.qualification !== "HSC" || class9Maths.subject !== "Mathematics (MTH)" || class9Maths.academicSession !== "2026-27") errors.push("Class IX HSC Mathematics syllabus must retain its Odisha board/session identity.");
if (!class9Maths.sourceId || !sourceIds.has(class9Maths.sourceId) || !Array.isArray(class9Maths.terms) || class9Maths.terms.length === 0) errors.push("Class IX HSC Mathematics syllabus has an invalid source or terms array.");
for (const term of class9Maths.terms || []) {
  if (!term.term || !Array.isArray(term.topics) || term.topics.length === 0) errors.push("Invalid Class IX HSC Mathematics term.");
  for (const topic of term.topics || []) if (!topic.title || !topic.sourceText || !topic.translationStatus) errors.push("Mathematics syllabus topic must retain its source text and translation-review status.");
}
if (class9MathsPractice.board !== "ODISHA_BOARD" || class9MathsPractice.class !== 9 || class9MathsPractice.qualification !== "HSC" || class9MathsPractice.subject !== "Mathematics (MTH)" || class9MathsPractice.academicSession !== "2026-27") errors.push("Class IX Mathematics practice bank must retain Odisha HSC 2026–27 identity.");
if (!class9MathsPractice.sourceId || !sourceIds.has(class9MathsPractice.sourceId) || !Array.isArray(class9MathsPractice.records) || class9MathsPractice.records.length === 0) errors.push("Class IX Mathematics practice bank has an invalid source or records array.");
const mathQuestionIds = new Set();
for (const record of class9MathsPractice.records || []) {
  if (!record.id || mathQuestionIds.has(record.id)) errors.push("Missing or duplicate ID in Class IX Mathematics practice bank: " + (record.id || "(missing)"));
  mathQuestionIds.add(record.id);
  if (record.board !== "ODISHA_BOARD" || record.class !== 9 || record.subject !== "Mathematics (MTH)" || record.academicSession !== "2026-27") errors.push("Incorrect identity on Mathematics practice record " + record.id);
  if (!record.content || !record.content.prompt || !Array.isArray(record.content.options) || record.content.options.length < 2) errors.push("Invalid question/options on Mathematics practice record " + record.id);
  if (!record.answer || !record.answer.correctOption || !record.answer.explanation) errors.push("Missing answer/explanation on Mathematics practice record " + record.id);
  if (!record.sourceIds || !record.sourceIds.includes(class9MathsPractice.sourceId)) errors.push("Mathematics practice record " + record.id + " does not reference the official syllabus source.");
  if (record.verificationStatus !== "needs_review") errors.push("New Mathematics practice record must remain needs_review until QA: " + record.id);
}

if (class9Science.board !== "ODISHA_BOARD" || class9Science.class !== 9 || class9Science.qualification !== "HSC" || class9Science.subject !== "General Science (GSC)" || class9Science.academicSession !== "2026-27") errors.push("Class IX HSC General Science syllabus must retain its Odisha board/session identity.");
if (!class9Science.sourceId || !sourceIds.has(class9Science.sourceId) || !Array.isArray(class9Science.terms) || class9Science.terms.length === 0) errors.push("Class IX HSC General Science syllabus has an invalid source or terms array.");
for (const term of class9Science.terms || []) {
  if (!term.term || !Array.isArray(term.topics) || term.topics.length === 0) errors.push("Invalid Class IX HSC General Science term.");
  for (const topic of term.topics || []) if (!topic.category || !topic.title || !topic.sourceText || !topic.translationStatus) errors.push("Science topic must retain category, source text and translation-review status.");
}
if (class9SciencePractice.board !== "ODISHA_BOARD" || class9SciencePractice.class !== 9 || class9SciencePractice.qualification !== "HSC" || class9SciencePractice.subject !== "General Science (GSC)" || class9SciencePractice.academicSession !== "2026-27") errors.push("Class IX General Science practice bank must retain Odisha HSC 2026–27 identity.");
if (!class9SciencePractice.sourceId || !sourceIds.has(class9SciencePractice.sourceId) || !Array.isArray(class9SciencePractice.records) || class9SciencePractice.records.length === 0) errors.push("Class IX General Science practice bank has an invalid source or records array.");
const scienceQuestionIds = new Set();
for (const record of class9SciencePractice.records || []) {
  if (!record.id || scienceQuestionIds.has(record.id)) errors.push("Missing or duplicate ID in Class IX General Science practice bank: " + (record.id || "(missing)"));
  scienceQuestionIds.add(record.id);
  if (record.board !== "ODISHA_BOARD" || record.class !== 9 || record.subject !== "General Science (GSC)" || record.academicSession !== "2026-27") errors.push("Incorrect identity on Science practice record " + record.id);
  if (!record.content || !record.content.prompt || !Array.isArray(record.content.options) || record.content.options.length !== 4) errors.push("Invalid question/options on Science practice record " + record.id);
  if (!record.answer || !["A", "B", "C", "D"].includes(record.answer.correctOption) || !record.answer.explanation) errors.push("Missing or invalid answer/explanation on Science practice record " + record.id);
  if (!record.sourceIds || !record.sourceIds.includes(class9SciencePractice.sourceId)) errors.push("Science practice record " + record.id + " does not reference the official syllabus source.");
  if (record.verificationStatus !== "needs_review") errors.push("New Science practice record must remain needs_review until QA: " + record.id);
}

if (class9SocialScience.board !== "ODISHA_BOARD" || class9SocialScience.class !== 9 || class9SocialScience.qualification !== "HSC" || class9SocialScience.subject !== "Social Science (SSC)" || class9SocialScience.academicSession !== "2026-27") errors.push("Class IX HSC Social Science syllabus must retain its Odisha board/session identity.");
if (!class9SocialScience.sourceId || !sourceIds.has(class9SocialScience.sourceId) || !Array.isArray(class9SocialScience.terms) || class9SocialScience.terms.length === 0) errors.push("Class IX HSC Social Science syllabus has an invalid source or terms array.");
for (const term of class9SocialScience.terms || []) {
  if (!term.term || !Array.isArray(term.topics) || term.topics.length === 0) errors.push("Invalid Class IX HSC Social Science term.");
  for (const topic of term.topics || []) if (!topic.category || !topic.title || !topic.sourceText || !topic.translationStatus) errors.push("Social Science topic must retain category, source text and translation-review status.");
}
if (class9SocialSciencePractice.board !== "ODISHA_BOARD" || class9SocialSciencePractice.class !== 9 || class9SocialSciencePractice.qualification !== "HSC" || class9SocialSciencePractice.subject !== "Social Science (SSC)" || class9SocialSciencePractice.academicSession !== "2026-27") errors.push("Class IX Social Science practice bank must retain Odisha HSC 2026–27 identity.");
if (!class9SocialSciencePractice.sourceId || !sourceIds.has(class9SocialSciencePractice.sourceId) || !Array.isArray(class9SocialSciencePractice.records) || class9SocialSciencePractice.records.length === 0) errors.push("Class IX Social Science practice bank has an invalid source or records array.");
const socialScienceQuestionIds = new Set();
for (const record of class9SocialSciencePractice.records || []) {
  if (!record.id || socialScienceQuestionIds.has(record.id)) errors.push("Missing or duplicate ID in Class IX Social Science practice bank: " + (record.id || "(missing)"));
  socialScienceQuestionIds.add(record.id);
  if (record.board !== "ODISHA_BOARD" || record.class !== 9 || record.subject !== "Social Science (SSC)" || record.academicSession !== "2026-27") errors.push("Incorrect identity on Social Science practice record " + record.id);
  if (!record.content || !record.content.prompt || !Array.isArray(record.content.options) || record.content.options.length !== 4) errors.push("Invalid question/options on Social Science practice record " + record.id);
  if (!record.answer || !["A", "B", "C", "D"].includes(record.answer.correctOption) || !record.answer.explanation) errors.push("Missing or invalid answer/explanation on Social Science practice record " + record.id);
  if (!record.sourceIds || !record.sourceIds.includes(class9SocialSciencePractice.sourceId)) errors.push("Social Science practice record " + record.id + " does not reference the official syllabus source.");
  if (record.verificationStatus !== "needs_review") errors.push("New Social Science practice record must remain needs_review until QA: " + record.id);
}

if (class9Practice.board !== "ODISHA_BOARD" || class9Practice.class !== 9 || class9Practice.qualification !== "HSC" || class9Practice.academicSession !== "2026-27") errors.push("Class IX English practice bank must retain Odisha HSC 2026–27 identity.");
if (!class9Practice.sourceId || !sourceIds.has(class9Practice.sourceId) || !Array.isArray(class9Practice.records) || class9Practice.records.length === 0) errors.push("Class IX English practice bank has an invalid source or records array.");
const practiceIds = new Set();
for (const record of class9Practice.records || []) {
  if (!record.id || practiceIds.has(record.id)) errors.push("Missing or duplicate ID in Class IX English practice bank: " + (record.id || "(missing)"));
  practiceIds.add(record.id);
  if (record.board !== "ODISHA_BOARD" || record.class !== 9 || record.subject !== "English (SLE)" || record.academicSession !== "2026-27") errors.push("Incorrect board/class/subject/session on practice record " + record.id);
  if (!record.content || !record.content.prompt || !Array.isArray(record.content.options) || record.content.options.length < 2) errors.push("Invalid question/options on practice record " + record.id);
  if (!record.answer || !record.answer.correctOption || !record.answer.explanation) errors.push("Missing answer/explanation on practice record " + record.id);
  if (!record.sourceIds || !record.sourceIds.includes(class9Practice.sourceId)) errors.push("Practice record " + record.id + " does not reference the official syllabus source.");
  if (record.verificationStatus !== "needs_review") errors.push("New practice record must remain needs_review until QA: " + record.id);
}
if (class9English.board !== "ODISHA_BOARD" || class9English.class !== 9 || class9English.qualification !== "HSC" || class9English.subject !== "English (SLE)") errors.push("Odisha Class IX English source record must retain the Odisha Board/HSC/English identity.");
if (!class9English.sourceId || !sourceIds.has(class9English.sourceId)) errors.push("Odisha Class IX English record references unknown sourceId.");
if (class9English.academicSession !== "2026-27" || !["partial_review_required", "in_review", "verified", "published"].includes(class9English.extractionStatus)) errors.push("Invalid session or extractionStatus in Odisha Class IX English source record.");
if (!Array.isArray(class9English.syllabusGroups) || class9English.syllabusGroups.length === 0) errors.push("Odisha Class IX English record must contain syllabusGroups.");
for (const group of class9English.syllabusGroups || []) {
  if (!group.term || !Array.isArray(group.topics) || group.topics.length === 0) errors.push("Invalid syllabus group in Odisha Class IX English record.");
  for (const topic of group.topics || []) if (!topic.category || !topic.title) errors.push("Topic missing category/title in Odisha Class IX English record.");
}
for (const subject of class10.subjects || []) {
  if (!subject.subject || !Array.isArray(subject.terms)) errors.push("Each Odisha Class X subject must have a name and terms array.");
  for (const term of subject.terms || []) {
    if (!term.term || !Array.isArray(term.topics)) errors.push("Invalid term structure for " + (subject.subject || "unknown subject") + ".");
    for (const topic of term.topics || []) if (!topic.category || !topic.title) errors.push("Topic missing category/title in " + (subject.subject || "unknown subject") + ".");
  }
}

if (!Array.isArray(learningTracks.trackDefinitions) || learningTracks.trackDefinitions.length === 0) errors.push("learning-track-catalog.json must contain trackDefinitions.");
const trackIds = new Set();
const allowedTrackStatuses = ["not_verified", "in_review", "verified", "published"];
for (const track of learningTracks.trackDefinitions || []) {
  if (!track.trackId || !track.displayName || !track.board || !Array.isArray(track.classes) || !Array.isArray(track.supportedMediums)) {
    errors.push("Learning track is missing required identity, class, or medium fields.");
    continue;
  }
  if (trackIds.has(track.trackId)) errors.push("Duplicate learning track ID: " + track.trackId);
  trackIds.add(track.trackId);
  if (!allowedTrackStatuses.includes(track.verificationStatus)) errors.push("Invalid verification status for learning track " + track.trackId);
  for (const sourceId of track.curriculumAuthoritySourceIds || []) {
    if (!sourceIds.has(sourceId)) errors.push("Learning track " + track.trackId + " references unknown source ID " + sourceId);
  }
}
for (const requiredTrack of ["ODISHA_STATE_BOARD", "ODISHA_MADHYAMA", "OAV_NCERT", "PRIVATE_CBSE_SCHOOL", "CISCE_ICSE"]) {
  if (!trackIds.has(requiredTrack)) errors.push("Missing required distinct learning track: " + requiredTrack);
}
if (!Array.isArray(learningTracks.requiredMappingFields) || !learningTracks.requiredMappingFields.includes("medium") || !learningTracks.requiredMappingFields.includes("prescribedBookTitle") || !learningTracks.requiredMappingFields.includes("academicSession")) {
  errors.push("Learning track mapping must distinguish medium, prescribed book, and academic session.");
}


if (odishaClass6to8.board !== "ODISHA_BOARD" || odishaClass6to8.sourceId !== "scert-odisha-new-books" || !sourceIds.has(odishaClass6to8.sourceId)) {
  errors.push("Classes VI-VIII Odisha inventory must reference the official SCERT source.");
}
if (!Array.isArray(odishaClass6to8.classInventories)) errors.push("Odisha Classes VI-VIII inventory must contain classInventories.");
const inventoriedClasses = new Set();
for (const classRecord of odishaClass6to8.classInventories || []) {
  if (![6, 7, 8].includes(classRecord.class)) errors.push("Unexpected class in Odisha Classes VI-VIII inventory.");
  if (inventoriedClasses.has(classRecord.class)) errors.push("Duplicate Odisha textbook inventory class: " + classRecord.class);
  inventoriedClasses.add(classRecord.class);
  if (!Array.isArray(classRecord.titles) || classRecord.titles.length === 0) errors.push("No titles listed for Odisha Class " + classRecord.class);
  const titles = new Set();
  for (const entry of classRecord.titles || []) {
    if (!entry.title || !entry.subjectCandidate) errors.push("Incomplete title record for Odisha Class " + classRecord.class);
    if (titles.has(entry.title)) errors.push("Duplicate title in Odisha Class " + classRecord.class + ": " + entry.title);
    titles.add(entry.title);
  }
}
for (const classLevel of [6, 7, 8]) if (!inventoriedClasses.has(classLevel)) errors.push("Missing Odisha textbook inventory for Class " + classLevel);
if (!odishaClass6to8.reuseNote || !Array.isArray(odishaClass6to8.sourceCaveats)) errors.push("Odisha Classes VI-VIII inventory must document verification/reuse caveats.");

const appSubjectStructure = catalog.appSubjectStructure;
if (!appSubjectStructure || appSubjectStructure.version !== 1 || !Array.isArray(appSubjectStructure.classes) || appSubjectStructure.classes.join(",") !== "6,7,8,9,10") {
  errors.push("Canonical app subject structure must cover Classes 6–10.");
}
const coreSubjectIds = (appSubjectStructure?.coreSubjects || []).map((subject) => subject.id);
if (coreSubjectIds.join(",") !== "mathematics,science,english,social-science") {
  errors.push("App navigation must contain exactly the four agreed core subjects: Mathematics, Science, English, Social Science.");
}
const socialScience = (appSubjectStructure?.coreSubjects || []).find((subject) => subject.id === "social-science");
const socialSectionIds = (socialScience?.sections || []).map((section) => section.id);
if (socialSectionIds.join(",") !== "history,geography,economics,civics-polity") {
  errors.push("Social Science must group History, Geography, Economics, and Civics/Political Science (Polity) as sections.");
}
if (!(appSubjectStructure?.rules || []).some((rule) => rule.includes("official syllabus")) ||
    !(appSubjectStructure?.rules || []).some((rule) => rule.includes("Madhyama"))) {
  errors.push("Canonical subject structure must preserve official-syllabus verification and separate Odisha learning tracks.");
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
console.log("Curriculum content validation passed: " + sources.sources.length + " official source records, " + catalog.coverage.length + " board/class coverage records, " + bookCatalog.entries.length + " textbook inventory entries, " + learningTracks.trackDefinitions.length + " distinct learning tracks and " + odishaClass6to8.classInventories.length + " Odisha Classes VI-VIII textbook inventories. Odisha Class X extraction status: " + class10.extractionStatus + "; Odisha Class IX English extraction status: " + class9English.extractionStatus + "; original Class IX practice questions: " + class9Practice.records.length + " English, " + class9MathsPractice.records.length + " Mathematics, " + class9SciencePractice.records.length + " General Science and " + class9SocialSciencePractice.records.length + " Social Science (needs review).");
