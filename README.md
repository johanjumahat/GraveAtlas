# Kubur AI

An AI chat app for Android with multi-provider support, voice conversation mode, and text-to-speech.

## Features

- **AI Chat** — text-based chat with multiple AI providers
- **Voice Conversation** — speak, AI responds with voice + text, auto-listens again
- **Multi-Provider** — Pollinations (no key), Groq, Gemini, OpenRouter, Cerebras, Mistral, DeepSeek, Together AI, SambaNova
- **Auto-Fallback** — if one model fails, automatically tries the next available one
- **Text-to-Speech** — read aloud with voice selection
- **Chat History** — persists across app restarts
- **No Registration** — works out of the box with Pollinations (no API key needed)

## Tech Stack

- Java 17
- Android SDK 34 (min SDK 24)
- Material Components
- RecyclerView
- No external AI SDKs — direct HTTP calls to provider APIs

## Build

```bash
# Debug build
./gradlew assembleDebug

# Release build (requires local.properties with keystore config)
./gradlew assembleRelease
```

For release signing, add to `local.properties`:
```
keystore.file=kubur-ai-release.p12
keystore.type=pkcs12
keystore.storePassword=your_password
keystore.keyAlias=your_alias
keystore.keyPassword=your_password
```

## Project Structure

```
app/src/main/java/com/putraworks/kuburai/
├── MainActivity.java          # Main chat page
└── chat/
    ├── AIClient.java          # HTTP calls to AI APIs
    ├── AIProvider.java         # Provider definitions
    ├── ChatAdapter.java        # RecyclerView adapter
    ├── ChatHistoryManager.java # Persistence
    ├── ChatMessage.java        # Data model
    └── SettingsManager.java    # API keys & settings
```

## License

Private project — all rights reserved.
