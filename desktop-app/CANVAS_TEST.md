# Canvas Management Test

## Test Steps:

1. **Start the app** (✓ Done - running on http://localhost:3002)

2. **Test Normal Chat Mode:**
   - Send a message asking for HTML code
   - Check if response contains code
   - Toggle to Canvas mode
   - Verify code appears in canvas

3. **Test New Canvas Creation:**
   - Click "New Canvas" button in Canvas Manager
   - Verify new canvas is created
   - Check if canvas history is updated

4. **Test Append vs Replace Mode:**
   - Toggle append mode ON
   - Send another message with code
   - Verify code is appended to existing canvas
   - Toggle append mode OFF
   - Send another message with code
   - Verify new canvas is created

5. **Test Canvas History:**
   - Create multiple canvases
   - Switch between them
   - Verify content loads correctly
   - Test delete functionality

6. **Test Persistence:**
   - Refresh page
   - Verify canvases are still there
   - Verify current canvas state is preserved

## Issues to Check:

- No unwanted reloads when switching canvases
- Canvas content doesn't accumulate unexpectedly
- Proper state management
- LocalStorage persistence
- UI responsiveness

## Expected Behavior:

- Canvas should only update when explicitly requested
- New canvases should be created only when needed
- Append mode should work as expected
- No memory leaks or performance issues
