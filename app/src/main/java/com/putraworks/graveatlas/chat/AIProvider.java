package com.putraworks.graveatlas.chat;

import java.util.Arrays;
import java.util.List;

/**
 * Available AI providers and their models.
 * Pollinations works out-of-the-box with zero registration.
 * All other providers offer free tiers (free registration, no credit card).
 * The app also auto-falls-back across models/providers when one becomes unavailable.
 */
public class AIProvider {

    public enum ApiFormat { GEMINI, OPENAI_COMPATIBLE }

    private final String id;
    private final String name;
    private final String description;
    private final String apiKeyUrl;
    private final ApiFormat apiFormat;
    private final String endpoint;
    private final List<String> models;
    private final List<String> modelLabels;
    private final boolean noKeyRequired;

    private AIProvider(String id, String name, String description, String apiKeyUrl,
                       ApiFormat apiFormat, String endpoint,
                       List<String> models, List<String> modelLabels,
                       boolean noKeyRequired) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.apiKeyUrl = apiKeyUrl;
        this.apiFormat = apiFormat;
        this.endpoint = endpoint;
        this.models = models;
        this.modelLabels = modelLabels;
        this.noKeyRequired = noKeyRequired;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getApiKeyUrl() { return apiKeyUrl; }
    public ApiFormat getApiFormat() { return apiFormat; }
    public String getEndpoint() { return endpoint; }
    public List<String> getModels() { return models; }
    public List<String> getModelLabels() { return modelLabels; }
    public boolean isNoKeyRequired() { return noKeyRequired; }

    public static List<AIProvider> getProviders() {
        return Arrays.asList(
            // ── Pollinations (no API key needed!) — FIRST so it's the default ──
            new AIProvider(
                "pollinations", "Pollinations (no key needed)",
                "100% free • no registration • no API key\nJust select and start chatting — works out of the box!",
                null,
                ApiFormat.OPENAI_COMPATIBLE,
                "https://text.pollinations.ai/openai/chat/completions",
                Arrays.asList(
                    "openai",
                    "openai-fast"
                ),
                Arrays.asList(
                    "GPT-OSS 20B (default)",
                    "GPT-OSS 20B Fast"
                ),
                true
            ),
            // ── Groq: most generous free tier, ultra-fast ──
            new AIProvider(
                "groq", "Groq",
                "Free • no card • ultra-fast inference\nGet key at console.groq.com/keys",
                "https://console.groq.com/keys",
                ApiFormat.OPENAI_COMPATIBLE,
                "https://api.groq.com/openai/v1/chat/completions",
                Arrays.asList(
                    "openai/gpt-oss-120b",
                    "openai/gpt-oss-20b",
                    "llama-3.3-70b-versatile",
                    "llama-3.1-8b-instant",
                    "groq/compound",
                    "groq/compound-mini"
                ),
                Arrays.asList(
                    "GPT-OSS 120B",
                    "GPT-OSS 20B",
                    "Llama 3.3 70B",
                    "Llama 3.1 8B",
                    "Groq Compound",
                    "Groq Compound Mini"
                ),
                false
            ),
            // ── Google Gemini ──
            new AIProvider(
                "gemini", "Google Gemini",
                "Free tier • 15 req/min\nGet key at aistudio.google.com/apikey",
                "https://aistudio.google.com/apikey",
                ApiFormat.GEMINI,
                "https://generativelanguage.googleapis.com/v1beta/models",
                Arrays.asList(
                    "gemini-3.5-flash",
                    "gemini-3.5-flash-lite",
                    "gemini-3-flash",
                    "gemini-2.5-flash",
                    "gemini-2.5-flash-lite",
                    "gemini-flash-latest"
                ),
                Arrays.asList(
                    "Gemini 3.5 Flash",
                    "Gemini 3.5 Flash Lite",
                    "Gemini 3 Flash",
                    "Gemini 2.5 Flash",
                    "Gemini 2.5 Flash Lite",
                    "Gemini Flash (latest)"
                ),
                false
            ),
            // ── OpenRouter (free models) ──
            new AIProvider(
                "openrouter", "OpenRouter",
                "Free models available (rotates over time)\nGet key at openrouter.ai/keys",
                "https://openrouter.ai/keys",
                ApiFormat.OPENAI_COMPATIBLE,
                "https://openrouter.ai/api/v1/chat/completions",
                Arrays.asList(
                    "openai/gpt-oss-20b:free",
                    "nvidia/nemotron-3-nano-30b-a3b:free",
                    "nvidia/nemotron-nano-9b-v2:free",
                    "nvidia/nemotron-nano-12b-v2-vl:free",
                    "google/gemma-4-26b-a4b-it:free",
                    "google/gemma-4-31b-it:free",
                    "inclusionai/ling-3.0-flash:free",
                    "cohere/north-mini-code:free"
                ),
                Arrays.asList(
                    "GPT-OSS 20B (free)",
                    "Nemotron 3 Nano 30B (free)",
                    "Nemotron Nano 9B (free)",
                    "Nemotron Nano 12B VL (free)",
                    "Gemma 4 26B A4B (free)",
                    "Gemma 4 31B (free)",
                    "Ling-3.0 Flash (free)",
                    "North Mini Code (free)"
                ),
                false
            ),
            // ── Cerebras ──
            new AIProvider(
                "cerebras", "Cerebras",
                "Free tier • fastest inference in the world\nGet key at cloud.cerebras.ai",
                "https://cloud.cerebras.ai",
                ApiFormat.OPENAI_COMPATIBLE,
                "https://api.cerebras.ai/v1/chat/completions",
                Arrays.asList(
                    "gpt-oss-120b",
                    "gpt-oss-20b",
                    "gemma-4-31b",
                    "zai-glm-4.7"
                ),
                Arrays.asList(
                    "GPT-OSS 120B",
                    "GPT-OSS 20B",
                    "Gemma 4 31B",
                    "GLM 4.7"
                ),
                false
            ),
            // ── Mistral AI ──
            new AIProvider(
                "mistral", "Mistral AI",
                "Free tier • fast European models\nGet key at console.mistral.ai/api-keys",
                "https://console.mistral.ai/api-keys",
                ApiFormat.OPENAI_COMPATIBLE,
                "https://api.mistral.ai/v1/chat/completions",
                Arrays.asList(
                    "mistral-small-latest",
                    "mistral-large-latest",
                    "open-mistral-7b",
                    "open-mixtral-8x7b",
                    "open-mixtral-8x22b"
                ),
                Arrays.asList(
                    "Mistral Small (latest)",
                    "Mistral Large (latest)",
                    "Open Mistral 7B",
                    "Open Mixtral 8x7B",
                    "Open Mixtral 8x22B"
                ),
                false
            ),
            // ── DeepSeek ──
            new AIProvider(
                "deepseek", "DeepSeek",
                "Free tier • strong reasoning models\nGet key at platform.deepseek.com/api-keys",
                "https://platform.deepseek.com/api_keys",
                ApiFormat.OPENAI_COMPATIBLE,
                "https://api.deepseek.com/v1/chat/completions",
                Arrays.asList(
                    "deepseek-chat",
                    "deepseek-reasoner"
                ),
                Arrays.asList(
                    "DeepSeek Chat (V3)",
                    "DeepSeek Reasoner (R1)"
                ),
                false
            ),
            // ── Together AI ──
            new AIProvider(
                "together", "Together AI",
                "Free credits • many open-source models\nGet key at api.together.ai/settings/api-keys",
                "https://api.together.ai/settings/api-keys",
                ApiFormat.OPENAI_COMPATIBLE,
                "https://api.together.xyz/v1/chat/completions",
                Arrays.asList(
                    "meta-llama/Llama-3.3-70B-Instruct-Turbo",
                    "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
                    "Qwen/Qwen2.5-7B-Instruct-Turbo",
                    "Qwen/Qwen2.5-72B-Instruct-Turbo",
                    "google/gemma-2-9b-it"
                ),
                Arrays.asList(
                    "Llama 3.3 70B Turbo",
                    "Llama 3.1 8B Turbo",
                    "Qwen 2.5 7B Turbo",
                    "Qwen 2.5 72B Turbo",
                    "Gemma 2 9B IT"
                ),
                false
            ),
            // ── SambaNova ──
            new AIProvider(
                "sambanova", "SambaNova",
                "Free tier • fast open-source models\nGet key at sambanova.ai",
                "https://cloud.sambanova.ai/apis",
                ApiFormat.OPENAI_COMPATIBLE,
                "https://api.sambanova.ai/v1/chat/completions",
                Arrays.asList(
                    "Meta-Llama-3.1-8B-Instruct",
                    "Meta-Llama-3.1-70B-Instruct",
                    "Llama-3.2-3B-Instruct"
                ),
                Arrays.asList(
                    "Llama 3.1 8B",
                    "Llama 3.1 70B",
                    "Llama 3.2 3B"
                ),
                false
            ),
            // ── Cohere ──
            new AIProvider(
                "cohere", "Cohere",
                "Free trial • good for general chat\nGet key at dashboard.cohere.com/api-keys",
                "https://dashboard.cohere.com/api-keys",
                ApiFormat.OPENAI_COMPATIBLE,
                "https://api.cohere.ai/v1/chat/completions",
                Arrays.asList(
                    "command-a-03-2025",
                    "command-r-plus",
                    "command-r"
                ),
                Arrays.asList(
                    "Command A",
                    "Command R+",
                    "Command R"
                ),
                false
            )
        );
    }
}
