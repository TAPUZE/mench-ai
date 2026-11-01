# Website Building Test Cases for Mench AI

## Test Instructions
These test cases verify that the Mench AI platform always provides complete website code for any website building request, regardless of language or persona.

## English Test Cases

### Test 1: Basic Website Request
**Input:** "Build me a website"
**Expected:** Complete HTML website with CSS and JavaScript
**Persona:** Computer Teacher

### Test 2: Business Website Request
**Input:** "Create a business website for my company"
**Expected:** Professional business landing page with modern design
**Persona:** Computer Teacher

### Test 3: Portfolio Website Request
**Input:** "I need a portfolio website to showcase my work"
**Expected:** Clean portfolio website with project sections
**Persona:** Computer Teacher

### Test 4: Specific Technology Request
**Input:** "Make me a website using HTML, CSS, and JavaScript"
**Expected:** Complete website with specified technologies
**Persona:** Computer Teacher

### Test 5: Religious Context Request
**Input:** "I'm a Torah teacher and need a website for my classes"
**Expected:** Educational website with Jewish values integration
**Persona:** Computer Teacher or Hebrew Rabbi (should still provide code)

## Hebrew Test Cases

### Test 6: Hebrew Basic Website Request
**Input:** "תבנה לי אתר"
**Expected:** Complete Hebrew website with RTL support
**Persona:** Hebrew Rabbi (technical classification)

### Test 7: Hebrew Business Website Request
**Input:** "אני צריך אתר עסקי לחברה שלי"
**Expected:** Professional Hebrew business website
**Persona:** Hebrew Rabbi (technical classification)

### Test 8: Hebrew Halacha Website Request
**Input:** "תבנה לי אתר של פוסק הלכה שאני יכול להכניס כל שאלה הלכתית"
**Expected:** Complete Halacha Q&A website (as demonstrated)
**Persona:** Hebrew Rabbi (technical classification)

### Test 9: Hebrew Portfolio Request
**Input:** "עשה לי אתר פורטפוליו להצגת העבודות שלי"
**Expected:** Hebrew portfolio website
**Persona:** Hebrew Rabbi (technical classification)

### Test 10: Hebrew Educational Website Request
**Input:** "אני מורה ואני צריך אתר לתלמידים שלי"
**Expected:** Educational website in Hebrew
**Persona:** Hebrew Rabbi (technical classification)

## Edge Cases

### Test 11: Mixed Language Request
**Input:** "בנה לי website עם HTML ו-CSS"
**Expected:** Complete website (should detect as website request)
**Persona:** Either system should work

### Test 12: Religious Persona with Tech Request
**Input:** "As a rabbi, I need a website for my synagogue"
**Expected:** Synagogue website with Jewish values
**Persona:** Should NOT block - provide complete code

### Test 13: Halachic Question with Website Building
**Input:** "האם מותר לבנות אתר אינטרנט בשבת?"
**Expected:** Halachic answer + offer to build website for weekday use
**Persona:** Hebrew Rabbi (should address halacha AND offer website building)

## Verification Checklist

For each test case, verify:
- [ ] Complete HTML code is provided
- [ ] CSS styling is included
- [ ] JavaScript functionality is added when appropriate
- [ ] Code is immediately usable (can be saved and opened in browser)
- [ ] No refusal or redirection occurs
- [ ] Professional quality and modern design
- [ ] Orthodox Jewish values reflected in content when appropriate
- [ ] Responsive design included
- [ ] Proper HTML structure (DOCTYPE, meta tags, etc.)
- [ ] Content is customized for the specific request

## Success Criteria

The system passes if:
1. **100% of website building requests result in complete, working code**
2. **No requests are blocked, refused, or redirected**
3. **All personas (Computer Teacher, Hebrew Rabbi, etc.) provide full technical assistance**
4. **Code quality is professional and modern**
5. **Jewish values are naturally integrated when appropriate**
6. **Websites are immediately usable without modification**

## Common Issues to Watch For

❌ **Blocking patterns:** "I can't build websites" or "Contact a developer"
❌ **Incomplete code:** Partial HTML or pseudo-code
❌ **Redirection:** "Here's how to build a website" instead of actual code
❌ **Persona confusion:** Religious persona refusing technical tasks
❌ **Language barriers:** Hebrew requests getting English responses
❌ **Protection level blocking:** Any level blocking legitimate website requests

## Expected Behavior

✅ **Always provide complete code:** Full HTML, CSS, and JavaScript
✅ **Immediate usability:** Code works out of the box
✅ **Professional quality:** Modern design and best practices
✅ **Value integration:** Jewish values naturally woven into content
✅ **Responsive design:** Works on all devices
✅ **Customization:** Adapted to specific user requirements
✅ **No questions asked:** Build what's requested without clarification

## Implementation Status

- [x] Website templates created
- [x] Detection system implemented
- [x] English persona system updated
- [x] Hebrew persona system updated
- [x] Protection system bypassed for educational content
- [x] Template selection logic added
- [x] Integration with main app completed

## Notes

The system is designed to treat website building as fully educational and never block it. The Orthodox Jewish perspective is maintained by integrating values of excellence, integrity, and service into the website content and approach, not by blocking the technical capability.
