# ExamMastery AI curriculum content foundation

This directory is the source of truth for curriculum metadata and original learning content. Do not treat placeholder chapter lists as a complete syllabus.

## Files
- `sources.json`: official curriculum/textbook source register, access status, and reuse notes.
- `syllabus-catalog.json`: target board/class/subject coverage matrix. Entries remain `not_verified` until an official syllabus for the applicable academic session has been reviewed.
- `content.schema.json`: structure for future chapter and learning-content records.
- `../scripts/validate-content.mjs`: validates JSON and basic coverage/status invariants.

## Content rules
1. Record the board, class, subject, academic session, source URL, date checked, and verification status.
2. Keep textbook source links separate from content we have permission to redistribute.
3. Never bundle or republish copyrighted textbooks unless explicit permission or an applicable licence allows it. NCERT's official portal says republishing and redistributing its textbooks or including them in software/digital content packages is prohibited without written permission; link to official resources instead where permitted.
4. Use original explanations, worked examples, practice questions, and revision aids; independently verify answers and map each item to a source and syllabus outcome.
5. Do not claim syllabus completion based on a few generic topic labels.
6. Track changes by academic session because syllabi and textbooks can change.

## Initial scope
Target boards: CBSE, CISCE/ICSE, Odisha Board.
Target classes: 6–10.
Learning languages planned: English, Hindi, Odia. Availability of a language varies by board, school, and subject and must be verified instead of assumed.

This is the initial data foundation, not a claim that the full syllabus or book library has already been collected.
