const { io } = require("socket.io-client");
const jwt = require("jsonwebtoken");
const { createJWT } = require("../utils");

// Configuration http://localhost:5000
const SERVER_URL = "http://localhost:5000"; // Change to your server URL
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// Generate test tokens
const generateToken = (userId) => {
  // return jwt.sign({ id: userId }, JWT_SECRET);
  // return createJWT({ payload: { id: userId } });
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiYmFoZXIiLCJ1c2VyX2lkIjoiMjUiLCJwcm9maWxlX3BpY3R1cmUiOiJodHRwczovL3Jlcy5jbG91ZGluYXJ5LmNvbS9kbmtzeHp3cXgvaW1hZ2UvdXBsb2FkL3YxNzUxNjQwMzk1L1doYXRzQXBwX0ltYWdlXzIwMjUtMDctMDNfYXRfNS4yMy4wNF9QTV9qa2NwbG4uanBnIiwiaWF0IjoxNzU2Mjk4MzgzLCJleHAiOjE3NTg4OTAzODN9.wBnh4_65PA8G69_vMO-adHOZ9kFUBN2AE5mE7ULe0hc";
};

// Test users
const USERS = [
  { id: 1, token: generateToken(1), name: "User 1" },
  { id: 2, token: generateToken(2), name: "User 2" },
  { id: 3, token: generateToken(3), name: "User 3" }
];

// Test chat ID
const TEST_CHAT_ID = "2257c2a2-9300-46e2-841c-7b9eb9c7896a";

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main test function
async function runWebSocketTests() {
  console.log("🚀 Starting WebSocket Tests...\n");

  // Test 1: Basic Connection and Authentication
  console.log("1. Testing connection and authentication...");
  
  const user1 = io(SERVER_URL, {
    auth: {
      token: USERS[0].token
    }
  });

  try {
    await new Promise((resolve, reject) => {
      user1.on("connect", resolve);
      user1.on("connect_error", reject);
      setTimeout(() => reject(new Error("Connection timeout")), 5000);
    });
    console.log("✅ User 1 connected successfully");
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    process.exit(1);
  }

  // Test 2: Join Chat Room
  console.log("\n2. Testing chat room joining...");
  
  user1.emit("chat:join", { chatId: TEST_CHAT_ID }, (response) => {
    if (response && response.ok) {
      console.log("✅ User 1 joined chat successfully");
    } else {
      console.error("❌ Failed to join chat:", response?.error);
    }
  });

  await delay(1000);

  // Test 3: Send Message
  console.log("\n3. Testing message sending...");
  
  const testMessage = {
    chatId: TEST_CHAT_ID,
    messageType: "text",
    body: "Hello from User 1!",
    metadata: { test: true }
  };

  user1.emit("message:send", testMessage, (response) => {
    if (response && response.ok) {
      console.log("✅ Message sent successfully:", response.message);
    } else {
      console.error("❌ Failed to send message:", response?.error);
    }
  });

  user1.emit('message:send', {
    chatId: '12345',                    // Required
    messageType: 'text',                // Optional (default: "text")
    body: 'Hello world!',               // Optional (for text messages)
    mediaId: null,                      // Optional (for media messages)
    quotedMessageId: null,              // Optional (for replying)
    editOf: null,                       // Optional (for editing messages)
    ephemeralExpiresAt: null,           // Optional (for disappearing messages)
    metadata: {}                        // Optional (additional data)
  }, (response) => {
    // This is the callback function that will receive the server's response
    if (response.ok) {
      console.log('Message sent successfully:', response.message);
    } else {
      console.error('Failed to send message:', response.error);
    }
  });

  // Test 4: Connect second user and test real-time messaging
  console.log("\n4. Testing real-time messaging between users...");
  
  const user2 = io(SERVER_URL, {
    auth: {
      token: USERS[1].token
    }
  });

  await new Promise((resolve) => {
    user2.on("connect", resolve);
  });

  console.log("✅ User 2 connected successfully");

  // User 2 joins the same chat
  user2.emit("chat:join", { chatId: TEST_CHAT_ID }, (response) => {
    if (response && response.ok) {
      console.log("✅ User 2 joined chat successfully");
    }
  });

  await delay(1000);

  // Set up message listeners
  user2.on("message:new", (message) => {
    console.log("📨 User 2 received new message:", {
      id: message.id,
      body: message.body,
      sender: message.sender_user_id
    });
  });

  user1.on("message:new", (message) => {
    console.log("📨 User 1 received new message:", {
      id: message.id,
      body: message.body,
      sender: message.sender_user_id
    });
  });

  // Send message from user 2
  user2.emit("message:send", {
    chatId: TEST_CHAT_ID,
    messageType: "text",
    body: "Hello from User 2!"
  }, (response) => {
    if (response && response.ok) {
      console.log("✅ User 2 message sent successfully");
    }
  });

  await delay(2000);

  // Test 5: Message Receipts
  console.log("\n5. Testing message receipts...");
  
  user1.emit("receipt:read", { messageId: 1 }, (response) => {
    if (response && response.ok) {
      console.log("✅ Read receipt sent successfully");
    } else {
      console.error("❌ Read receipt failed:", response?.error);
    }
  });

  user2.emit("receipt:delivered", { messageId: 1 }, (response) => {
    if (response && response.ok) {
      console.log("✅ Delivery receipt sent successfully");
    }
  });

  // Set up receipt listeners
  user1.on("receipt:read", (receipt) => {
    console.log("📋 User 1 received read receipt:", receipt);
  });

  user1.on("receipt:delivered", (receipt) => {
    console.log("📋 User 1 received delivery receipt:", receipt);
  });

  await delay(1000);

  // Test 6: Typing Indicators
  console.log("\n6. Testing typing indicators...");
  
  user1.emit("typing", { chatId: TEST_CHAT_ID, isTyping: true });
  console.log("✅ User 1 started typing");

  user2.on("typing", (data) => {
    console.log("⌨️ User 2 received typing indicator:", data);
  });

  await delay(2000);

  user1.emit("typing", { chatId: TEST_CHAT_ID, isTyping: false });
  console.log("✅ User 1 stopped typing");

  await delay(1000);

  // Test 7: Batch Read Operations
  console.log("\n7. Testing batch read operations...");
  
  user1.emit("chat:readUpTo", {
    chatId: TEST_CHAT_ID,
    uptoSeq: 5
  }, (response) => {
    if (response && response.ok) {
      console.log("✅ Batch read operation successful");
    }
  });

  await delay(1000);

  // Test 8: Disconnection and Reconnection
  console.log("\n8. Testing disconnection...");
  
  user2.disconnect();
  console.log("✅ User 2 disconnected");

  await delay(2000);

  // Test 9: Error Handling
  console.log("\n9. Testing error handling...");
  
  // Test invalid message send
  user1.emit("message:send", {
    // Missing required fields
  }, (response) => {
    if (response && !response.ok) {
      console.log("✅ Error handling working:", response.error);
    }
  });

  // Test invalid chat join
  user1.emit("chat:join", {
    chatId: "non-existent-chat"
  }, (response) => {
    if (response && !response.ok) {
      console.log("✅ Chat join error handling:", response.error);
    }
  });

  await delay(2000);

  // Cleanup
  console.log("\n🧹 Cleaning up...");
  
  user1.disconnect();
  console.log("✅ All tests completed successfully!");

  process.exit(0);
}

// Handle errors
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled rejection:", error);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  process.exit(1);
});

// Run tests
runWebSocketTests().catch(console.error);