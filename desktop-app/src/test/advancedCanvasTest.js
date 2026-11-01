// Test file to verify the advanced canvas functionality

// Simple test function
function testAdvancedCanvas() {
    console.log("Advanced Canvas Test");
    
    // Test the file system manager
    if (window.showDirectoryPicker) {
        console.log("File System Access API is supported");
    } else {
        console.log("File System Access API is not supported");
    }
    
    // Test Monaco Editor
    if (window.monaco) {
        console.log("Monaco Editor is available");
    } else {
        console.log("Monaco Editor is not available");
    }
    
    return "Advanced Canvas Test Complete";
}

// Export for testing
export { testAdvancedCanvas };
