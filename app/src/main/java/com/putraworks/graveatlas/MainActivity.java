package com.putraworks.graveatlas;

import android.Manifest;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.putraworks.graveatlas.chat.AIClient;
import com.putraworks.graveatlas.chat.AIProvider;
import com.putraworks.graveatlas.chat.ChatAdapter;
import com.putraworks.graveatlas.chat.ChatHistoryManager;
import com.putraworks.graveatlas.chat.ChatMessage;
import com.putraworks.graveatlas.chat.SettingsManager;
import com.putraworks.graveatlas.chat.AIDataInterceptor;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * GraveAtlas — Main Activity
 *
 * The main page IS the AI chat. Features:
 * - Multiple AI providers (Pollinations, Groq, Gemini, OpenRouter, etc.)
 * - Text chat with automatic fallback across providers
 * - Voice conversation mode (speak → AI responds → auto-listen loop)
 * - Text-to-speech with voice selection
 * - Chat history persistence
 */
public class MainActivity extends AppCompatActivity {

    private MaterialToolbar toolbar;
    private Spinner spinnerProvider, spinnerModel;
    private RecyclerView rvMessages;
    private ChatAdapter adapter;
    private View progressTyping;
    private TextInputEditText etInput;
    private MaterialButton btnSend, btnTestModels, btnMic, btnSpeaker;

    // Conversation mode UI
    private LinearLayout conversationOverlay;
    private TextView tvConversationStatus;
    private ProgressBar conversationProgress;

    private SettingsManager settings;
    private ChatHistoryManager historyManager;
    private List<AIProvider> providers;
    private AIProvider currentProvider;
    private String currentModel;
    private boolean isWaiting = false;
    private boolean isTesting = false;

    // Conversation state
    private boolean conversationMode = false;
    private boolean isListening = false;
    private boolean isSpeaking = false;

    // TTS
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private List<Voice> availableVoices;
    private String selectedVoiceName;

    private ActivityResultLauncher<Intent> speechRecognizerLauncher;
    private ActivityResultLauncher<String> micPermissionLauncher;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        settings = new SettingsManager(this);
        historyManager = new ChatHistoryManager(this);
        providers = AIProvider.getProviders();

        registerLaunchers();
        initViews();
        setupSpinners();
        initTextToSpeech();

        // Phase 16: Handle prefill question from AI-native home screen
        String prefillQuestion = getIntent().getStringExtra("prefill_question");
        if (prefillQuestion != null && !prefillQuestion.isEmpty()) {
            etInput.setText(prefillQuestion);
            etInput.requestFocus();
            // Auto-send after a brief delay to let the UI settle
            etInput.postDelayed(() -> {
                if (btnSend != null) btnSend.performClick();
            }, 300);
        }
    }

    // ── TTS Setup ──

    private void initTextToSpeech() {
        tts = new TextToSpeech(this, status -> {
            ttsReady = (status == TextToSpeech.SUCCESS);
            if (ttsReady) {
                tts.setLanguage(Locale.getDefault());
                loadVoices();
                String savedVoice = settings.getSelectedVoice();
                if (savedVoice != null && availableVoices != null) {
                    selectedVoiceName = savedVoice;
                    for (Voice v : availableVoices) {
                        if (v.getName().equals(savedVoice)) { tts.setVoice(v); break; }
                    }
                }
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) {
                        isSpeaking = true;
                        mainHandler.post(() -> {
                            if (conversationMode) {
                                tvConversationStatus.setText("AI speaking...");
                                conversationProgress.setVisibility(View.VISIBLE);
                            }
                        });
                    }

                    @Override
                    public void onDone(String utteranceId) {
                        isSpeaking = false;
                        mainHandler.post(() -> {
                            if (conversationMode) {
                                tvConversationStatus.setText("Listening...");
                                startListening();
                            }
                        });
                    }

                    @Override
                    public void onError(String utteranceId) {
                        isSpeaking = false;
                        mainHandler.post(() -> {
                            if (conversationMode) {
                                startListening();
                            }
                        });
                    }
                });
            }
        });
        updateSpeakerIcon();
    }

    private void loadVoices() {
        if (tts == null) return;
        try {
            Set<Voice> voices = tts.getVoices();
            if (voices != null && !voices.isEmpty()) {
                availableVoices = new ArrayList<>(voices);
                Collections.sort(availableVoices, (a, b) -> a.getName().compareTo(b.getName()));
            }
        } catch (Exception e) {
            availableVoices = null;
        }
    }

    private void showVoicePicker() {
        if (availableVoices == null || availableVoices.isEmpty()) {
            Toast.makeText(this, "No additional voices on this device", Toast.LENGTH_SHORT).show();
            return;
        }
        List<String> voiceLabels = new ArrayList<>();
        List<String> voiceNames = new ArrayList<>();
        for (Voice v : availableVoices) {
            voiceLabels.add(v.getName() + " (" + v.getLocale().getDisplayName() + ")");
            voiceNames.add(v.getName());
        }
        int selected = 0;
        if (selectedVoiceName != null) {
            selected = voiceNames.indexOf(selectedVoiceName);
            if (selected < 0) selected = 0;
        } else if (ttsReady && tts != null) {
            try {
                android.speech.tts.Voice currentVoice = tts.getVoice();
                if (currentVoice != null) {
                    int idx = voiceNames.indexOf(currentVoice.getName());
                    if (idx >= 0) selected = idx;
                }
            } catch (Exception ignored) {}
            if (selected == 0) {
                try {
                    android.speech.tts.Voice defaultVoice = tts.getDefaultVoice();
                    if (defaultVoice != null) {
                        int idx = voiceNames.indexOf(defaultVoice.getName());
                        if (idx >= 0) selected = idx;
                    }
                } catch (Exception ignored) {}
            }
        }
        new AlertDialog.Builder(this)
            .setTitle("Select Voice")
            .setSingleChoiceItems(voiceLabels.toArray(new String[0]), selected, (d, which) -> {
                selectedVoiceName = voiceNames.get(which);
                if (ttsReady && tts != null) {
                    tts.setVoice(availableVoices.get(which));
                }
                settings.setSelectedVoice(selectedVoiceName);
                Toast.makeText(this, "Voice: " + voiceLabels.get(which), Toast.LENGTH_SHORT).show();
                d.dismiss();
            })
            .setNeutralButton("Reset to Default", (d, which) -> {
                selectedVoiceName = null;
                settings.setSelectedVoice(null);
                if (ttsReady && tts != null) {
                    tts.setVoice(availableVoices.get(0));
                    tts.setLanguage(Locale.getDefault());
                }
                Toast.makeText(this, "Voice reset to default", Toast.LENGTH_SHORT).show();
            })
            .setNegativeButton("Cancel", null)
            .show();
    }

    // ── Speech-to-text ──

    private void registerLaunchers() {
        speechRecognizerLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                isListening = false;
                if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                    ArrayList<String> matches = result.getData()
                        .getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                    if (matches != null && !matches.isEmpty()) {
                        String recognized = matches.get(0);
                        if (conversationMode) {
                            sendAutoMessage(recognized);
                        } else {
                            String existing = etInput.getText() != null ? etInput.getText().toString() : "";
                            String combined = existing.isEmpty() ? recognized : existing + " " + recognized;
                            etInput.setText(combined);
                            etInput.setSelection(combined.length());
                        }
                    } else if (conversationMode) {
                        startListening();
                    }
                } else if (conversationMode && result.getResultCode() != RESULT_CANCELED) {
                    startListening();
                } else if (conversationMode) {
                    tvConversationStatus.setText("Tap mic to resume");
                    conversationProgress.setVisibility(View.GONE);
                }
            });

        micPermissionLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestPermission(),
            granted -> {
                if (granted) {
                    toggleConversationMode();
                } else {
                    Toast.makeText(this, "Microphone permission is needed for voice chat", Toast.LENGTH_SHORT).show();
                }
            });
    }

    // ── Conversation Mode ──

    private void toggleConversationMode() {
        if (conversationMode) {
            stopConversationMode();
        } else {
            startConversationMode();
        }
    }

    private void startConversationMode() {
        if (currentProvider.getApiKeyUrl() != null && !settings.hasApiKey(currentProvider.getId())) {
            showApiKeyDialog();
            return;
        }

        conversationMode = true;
        settings.setTtsEnabled(true);
        updateSpeakerIcon();

        conversationOverlay.setVisibility(View.VISIBLE);
        tvConversationStatus.setText("Listening...");
        conversationProgress.setVisibility(View.VISIBLE);

        btnMic.setBackgroundTintList(android.content.res.ColorStateList.valueOf(
            getColorCompat(R.color.danger)));

        startListening();
    }

    private void stopConversationMode() {
        conversationMode = false;
        isListening = false;

        conversationOverlay.setVisibility(View.GONE);
        conversationProgress.setVisibility(View.GONE);

        btnMic.setBackgroundTintList(android.content.res.ColorStateList.valueOf(
            getColorCompat(R.color.text_secondary)));

        if (tts != null) tts.stop();
        isSpeaking = false;
    }

    private void startListening() {
        if (!conversationMode || isWaiting || isSpeaking) return;

        boolean hasPermission = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED;
        if (!hasPermission) {
            micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO);
            return;
        }

        launchSpeechRecognizer();
    }

    private void launchSpeechRecognizer() {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault());
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Listening...");
        try {
            isListening = true;
            speechRecognizerLauncher.launch(intent);
        } catch (Exception e) {
            isListening = false;
            Toast.makeText(this, "Speech recognition not available on this device", Toast.LENGTH_SHORT).show();
            if (conversationMode) {
                tvConversationStatus.setText("Speech recognition unavailable. Tap mic to stop.");
                conversationProgress.setVisibility(View.GONE);
            }
        }
    }

    // ── Auto-send in conversation mode ──

    private void sendAutoMessage(String text) {
        if (text == null || text.trim().isEmpty()) {
            if (conversationMode) startListening();
            return;
        }

        adapter.addMessage(new ChatMessage(text, true));
        rvMessages.scrollToPosition(adapter.getItemCount() - 1);

        tvConversationStatus.setText("AI thinking...");
        conversationProgress.setVisibility(View.VISIBLE);

        isWaiting = true;
        progressTyping.setVisibility(View.VISIBLE);
        btnSend.setEnabled(false);

        List<ChatMessage> apiMessages = new ArrayList<>(adapter.getMessages());
        List<Candidate> candidates = buildFallbackCandidates();
        attemptCandidate(apiMessages, candidates, 0, new ArrayList<>());
    }

    // ── TTS helpers ──

    private void onSpeakerToggle() {
        boolean newState = !settings.isTtsEnabled();
        settings.setTtsEnabled(newState);
        updateSpeakerIcon();
        if (!newState && tts != null) {
            tts.stop();
            isSpeaking = false;
            if (conversationMode) {
                stopConversationMode();
            }
        }
        Toast.makeText(this, newState ? "Read aloud ON" : "Read aloud OFF", Toast.LENGTH_SHORT).show();
    }

    private void updateSpeakerIcon() {
        if (btnSpeaker == null) return;
        int icon = settings.isTtsEnabled()
            ? android.R.drawable.ic_lock_silent_mode_off
            : android.R.drawable.ic_media_play;
        btnSpeaker.setIconResource(icon);
        btnSpeaker.setBackgroundTintList(android.content.res.ColorStateList.valueOf(
            getColorCompat(settings.isTtsEnabled() ? R.color.primary : R.color.text_secondary)));
    }

    private int getColorCompat(int colorRes) {
        return ContextCompat.getColor(this, colorRes);
    }

    private void speakIfEnabled(String text) {
        if (!settings.isTtsEnabled() || !ttsReady || tts == null) return;
        String toSpeak = text;
        int noteEnd = toSpeak.indexOf("\n\n");
        if (toSpeak.startsWith("↻") && noteEnd > 0) {
            toSpeak = toSpeak.substring(noteEnd + 2);
        }
        tts.speak(toSpeak, TextToSpeech.QUEUE_FLUSH, null, "ai_response");
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }

    // ── Views ──

    private void initViews() {
        toolbar = findViewById(R.id.toolbar);
        spinnerProvider = findViewById(R.id.spinnerProvider);
        spinnerModel = findViewById(R.id.spinnerModel);
        rvMessages = findViewById(R.id.rvMessages);
        progressTyping = findViewById(R.id.progressTyping);
        etInput = findViewById(R.id.etInput);
        btnSend = findViewById(R.id.btnSend);
        btnTestModels = findViewById(R.id.btnTestModels);
        btnMic = findViewById(R.id.btnMic);
        btnSpeaker = findViewById(R.id.btnSpeaker);
        conversationOverlay = findViewById(R.id.conversationOverlay);
        tvConversationStatus = findViewById(R.id.tvConversationStatus);
        conversationProgress = findViewById(R.id.conversationProgress);

        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setTitle("GraveAtlas");
        }

        adapter = new ChatAdapter();
        rvMessages.setLayoutManager(new LinearLayoutManager(this));
        rvMessages.setAdapter(adapter);
        adapter.setOnChangeListener(() -> historyManager.save(adapter.getMessages()));
        adapter.setOnMessageLongClickListener(this::showMessageActions);

        List<ChatMessage> savedHistory = historyManager.load();
        if (!savedHistory.isEmpty()) {
            adapter.restoreMessages(savedHistory);
        } else {
            adapter.addMessage(new ChatMessage(
                "Welcome to GraveAtlas!\n\n"
                + "✅ Pollinations is ready — no API key needed, just start chatting!\n\n"
                + "Want more models? Pick another provider and tap the wrench icon to add your free API key.\n"
                + "• Press \"Test All\" to check which models are online (✓/✗).\n"
                + "• Tap the mic for VOICE CONVERSATION — speak, AI auto-responds "
                + "in voice + text, then listens again. Tap mic again to stop.\n"
                + "• Or type and press send for text-only chat.\n"
                + "• Speaker icon toggles read-aloud. Long-press speaker for voice options.\n"
                + "• Long-press any message to copy it.\n"
                + "• Chat history is saved automatically — use \"Clear Chat\" to reset.", false));
        }

        btnSend.setOnClickListener(v -> sendMessage());
        btnTestModels.setOnClickListener(v -> testAllModels());
        btnMic.setOnClickListener(v -> toggleConversationMode());
        btnSpeaker.setOnClickListener(v -> onSpeakerToggle());
        btnSpeaker.setOnLongClickListener(v -> { showVoicePicker(); return true; });

        MaterialButton btnStopConversation = findViewById(R.id.btnStopConversation);
        btnStopConversation.setOnClickListener(v -> stopConversationMode());
    }

    // ── Spinners ──

    private void setupSpinners() {
        List<String> providerNames = new ArrayList<>();
        for (AIProvider p : providers) providerNames.add(p.getName());
        ArrayAdapter<String> providerAdapter = new ArrayAdapter<>(
            this, android.R.layout.simple_spinner_item, providerNames);
        providerAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerProvider.setAdapter(providerAdapter);

        int savedProvider = settings.getSelectedProvider();
        if (savedProvider >= 0 && savedProvider < providers.size()) spinnerProvider.setSelection(savedProvider);

        spinnerProvider.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                currentProvider = providers.get(position);
                settings.setSelectedProvider(position);
                updateModelSpinner();
                updateToolbarSubtitle();
            }
            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });

        currentProvider = providers.get(spinnerProvider.getSelectedItemPosition());
        updateModelSpinner();
        updateToolbarSubtitle();
    }

    private void updateModelSpinner() {
        if (currentProvider == null) return;
        List<String> statusLabels = buildStatusLabels(currentProvider);
        ArrayAdapter<String> modelAdapter = new ArrayAdapter<>(
            this, android.R.layout.simple_spinner_item, statusLabels);
        modelAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerModel.setAdapter(modelAdapter);

        String savedModel = settings.getSelectedModel(currentProvider.getId());
        if (savedModel != null) {
            int index = currentProvider.getModels().indexOf(savedModel);
            if (index >= 0) spinnerModel.setSelection(index);
        }
        currentModel = currentProvider.getModels().get(spinnerModel.getSelectedItemPosition());

        spinnerModel.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                currentModel = currentProvider.getModels().get(position);
                settings.setSelectedModel(currentProvider.getId(), currentModel);
                updateToolbarSubtitle();
            }
            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });
    }

    private void refreshModelSpinnerLabels() {
        if (currentProvider == null) return;
        ArrayAdapter<String> adapter = (ArrayAdapter<String>) spinnerModel.getAdapter();
        if (adapter == null) return;
        List<String> labels = buildStatusLabels(currentProvider);
        adapter.clear();
        adapter.addAll(labels);
        adapter.notifyDataSetChanged();
    }

    private List<String> buildStatusLabels(AIProvider provider) {
        List<String> labels = provider.getModelLabels();
        List<String> models = provider.getModels();
        List<String> result = new ArrayList<>();
        for (int i = 0; i < labels.size(); i++) {
            Boolean status = settings.getModelStatus(provider.getId(), models.get(i));
            String prefix = status != null ? (status ? "✓ " : "✗ ") : "";
            result.add(prefix + labels.get(i));
        }
        return result;
    }

    private void updateToolbarSubtitle() {
        if (getSupportActionBar() == null || currentProvider == null) return;
        String modelLabel = "";
        List<String> labels = currentProvider.getModelLabels();
        if (spinnerModel != null && spinnerModel.getSelectedItemPosition() < labels.size()) {
            modelLabel = labels.get(spinnerModel.getSelectedItemPosition());
        }
        getSupportActionBar().setSubtitle(currentProvider.getName() + " • " + modelLabel);
    }

    // ── Test All ──

    private void testAllModels() {
        if (isTesting) return;
        if (currentProvider.getApiKeyUrl() != null && !settings.hasApiKey(currentProvider.getId())) { showApiKeyDialog(); return; }

        isTesting = true;
        btnTestModels.setEnabled(false);
        btnTestModels.setText("Testing...");
        settings.clearModelStatuses(currentProvider.getId());
        refreshModelSpinnerLabels();

        List<String> models = currentProvider.getModels();
        String apiKey = (currentProvider.getApiKeyUrl() != null) ? settings.getApiKey(currentProvider.getId()) : "";
        final int total = models.size();
        final int[] completed = {0};
        final int[] passed = {0};
        testNextModel(models, apiKey, 0, total, completed, passed);
    }

    private void testNextModel(List<String> models, String apiKey, int index, int total,
                               int[] completed, int[] passed) {
        if (index >= total) {
            mainHandler.post(() -> {
                isTesting = false;
                btnTestModels.setEnabled(true);
                btnTestModels.setText("Test All");
                refreshModelSpinnerLabels();
                Toast.makeText(this, passed[0] + "/" + total + " models working", Toast.LENGTH_SHORT).show();
            });
            return;
        }
        String modelId = models.get(index);
        btnTestModels.setText("Testing " + (index + 1) + "/" + total + "...");
        List<ChatMessage> testMessages = new ArrayList<>();
        testMessages.add(new ChatMessage("Reply with just the word OK", true));
        AIClient client = new AIClient(currentProvider, apiKey, modelId);
        client.chat(testMessages, new AIClient.Callback() {
            @Override
            public void onSuccess(String response) {
                settings.setModelStatus(currentProvider.getId(), modelId, true);
                completed[0]++; passed[0]++;
                mainHandler.post(() -> refreshModelSpinnerLabels());
                testNextModel(models, apiKey, index + 1, total, completed, passed);
            }
            @Override
            public void onError(String error) {
                settings.setModelStatus(currentProvider.getId(), modelId, false);
                completed[0]++;
                mainHandler.post(() -> refreshModelSpinnerLabels());
                testNextModel(models, apiKey, index + 1, total, completed, passed);
            }
        });
    }

    // ── Chat with fallback ──

    private static class Candidate {
        final AIProvider provider; final String model; final String modelLabel;
        Candidate(AIProvider p, String m, String l) { provider = p; model = m; modelLabel = l; }
    }

    private List<Candidate> buildFallbackCandidates() {
        List<Candidate> candidates = new ArrayList<>();
        List<String> curModels = currentProvider.getModels();
        List<String> curLabels = currentProvider.getModelLabels();
        int curIndex = curModels.indexOf(currentModel);
        if (curIndex >= 0) candidates.add(new Candidate(currentProvider, curModels.get(curIndex), curLabels.get(curIndex)));
        for (int i = 0; i < curModels.size(); i++) {
            if (i == curIndex) continue;
            candidates.add(new Candidate(currentProvider, curModels.get(i), curLabels.get(i)));
        }
        for (AIProvider p : providers) {
            if (p.getId().equals(currentProvider.getId())) continue;
            if (p.getApiKeyUrl() != null && !settings.hasApiKey(p.getId())) continue;
            for (int i = 0; i < p.getModels().size(); i++) {
                candidates.add(new Candidate(p, p.getModels().get(i), p.getModelLabels().get(i)));
            }
        }
        return candidates;
    }

    private void sendMessage() {
        String text = etInput.getText().toString().trim();
        if (text.isEmpty()) return;
        if (currentProvider.getApiKeyUrl() != null && !settings.hasApiKey(currentProvider.getId())) { showApiKeyDialog(); return; }
        if (isWaiting) return;

        adapter.addMessage(new ChatMessage(text, true));
        etInput.setText("");
        isWaiting = true;
        progressTyping.setVisibility(View.VISIBLE);
        btnSend.setEnabled(false);

        List<ChatMessage> apiMessages = new ArrayList<>(adapter.getMessages());
        List<Candidate> candidates = buildFallbackCandidates();

        // Phase 16.1: RAG interceptor — query GraveAtlas database before sending to AI
        AIDataInterceptor interceptor = new AIDataInterceptor();
        interceptor.intercept(text, apiMessages, new AIDataInterceptor.InterceptorCallback() {
            @Override
            public void onReady(List<ChatMessage> augmentedMessages, String searchContext) {
                attemptCandidate(augmentedMessages, candidates, 0, new ArrayList<>());
            }

            @Override
            public void onSkipped(List<ChatMessage> originalMessages) {
                attemptCandidate(originalMessages, candidates, 0, new ArrayList<>());
            }
        });
    }

    private void attemptCandidate(List<ChatMessage> apiMessages, List<Candidate> candidates,
                                   int index, List<String> failureLog) {
        if (index >= candidates.size()) { finishWithFailure(failureLog); return; }
        Candidate candidate = candidates.get(index);
        String apiKey = (candidate.provider.getApiKeyUrl() != null) ? settings.getApiKey(candidate.provider.getId()) : "";
        AIClient client = new AIClient(candidate.provider, apiKey, candidate.model);

        client.chat(apiMessages, new AIClient.Callback() {
            @Override
            public void onSuccess(String response) {
                final int finalIndex = index;
                final Candidate finalCandidate = candidate;
                mainHandler.post(() -> {
                    finishWaiting();
                    String prefix = "";
                    if (finalIndex > 0) {
                        prefix = "↻ Auto-switched to " + finalCandidate.provider.getName()
                            + " · " + finalCandidate.modelLabel
                            + " (previous option was unavailable)\n\n";
                    }
                    String fullMessage = prefix + response;
                    adapter.addMessage(new ChatMessage(fullMessage, false));
                    rvMessages.scrollToPosition(adapter.getItemCount() - 1);

                    if (conversationMode) {
                        tvConversationStatus.setText("AI speaking...");
                        conversationProgress.setVisibility(View.VISIBLE);
                    }
                    speakIfEnabled(fullMessage);
                    if (conversationMode && (!settings.isTtsEnabled() || !ttsReady)) {
                        tvConversationStatus.setText("Listening...");
                        startListening();
                    }
                });
            }
            @Override
            public void onError(String error) {
                failureLog.add(candidate.provider.getName() + " · " + candidate.modelLabel + ": " + error);
                mainHandler.post(() -> attemptCandidate(apiMessages, candidates, index + 1, failureLog));
            }
        });
    }

    private void finishWaiting() {
        progressTyping.setVisibility(View.GONE);
        btnSend.setEnabled(true);
        isWaiting = false;
    }

    private void finishWithFailure(List<String> failureLog) {
        finishWaiting();
        StringBuilder sb = new StringBuilder("⚠ All available models failed:\n");
        for (String line : failureLog) sb.append("• ").append(line).append("\n");
        sb.append("\nAdd another provider's free API key to unlock more fallback options.");
        adapter.addMessage(new ChatMessage(sb.toString(), false, true));
        rvMessages.scrollToPosition(adapter.getItemCount() - 1);
        if (conversationMode) {
            tvConversationStatus.setText("Error. Tap mic to retry or stop.");
            conversationProgress.setVisibility(View.GONE);
        }
    }

    // ── API Key Dialog ──

    private void showApiKeyDialog() {
        View dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_api_key, null);
        TextView tvName = dialogView.findViewById(R.id.tvProviderName);
        TextView tvDesc = dialogView.findViewById(R.id.tvProviderDesc);
        TextView tvUrl = dialogView.findViewById(R.id.tvApiKeyUrl);
        TextInputEditText etKey = dialogView.findViewById(R.id.etApiKey);
        tvName.setText(currentProvider.getName() + " API Key");
        tvDesc.setText(currentProvider.getDescription());
        if (currentProvider.getApiKeyUrl() != null) {
            tvUrl.setText("Get your free API key → " + currentProvider.getApiKeyUrl());
            tvUrl.setOnClickListener(v -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(currentProvider.getApiKeyUrl()))));
        } else {
            tvUrl.setText("No API key needed — just start chatting!");
        }
        String existingKey = settings.getApiKey(currentProvider.getId());
        if (!existingKey.isEmpty()) etKey.setText(existingKey);
        new AlertDialog.Builder(this)
            .setView(dialogView)
            .setPositiveButton("Save", (d, w) -> {
                String key = etKey.getText().toString().trim();
                if (!key.isEmpty()) {
                    settings.setApiKey(currentProvider.getId(), key);
                    Toast.makeText(this, "API key saved", Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(this, "Please enter an API key", Toast.LENGTH_SHORT).show();
                }
            })
            .setNegativeButton("Cancel", null)
            .show();
    }

    // ── Copy message ──

    private void showMessageActions(ChatMessage message) {
        new AlertDialog.Builder(this)
            .setItems(new String[]{"Copy message"}, (d, which) -> {
                ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                ClipData clip = ClipData.newPlainText("Chat message", message.getContent());
                clipboard.setPrimaryClip(clip);
                Toast.makeText(this, "Copied to clipboard", Toast.LENGTH_SHORT).show();
            })
            .show();
    }

    // ── Menu ──

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.chat_menu, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        int id = item.getItemId();
        if (id == android.R.id.home) { finish(); return true; }
        if (id == R.id.action_api_key) { showApiKeyDialog(); return true; }
        if (id == R.id.action_clear_chat) {
            adapter.clear();
            historyManager.clear();
            adapter.addMessage(new ChatMessage("Chat cleared. Ask me anything!", false));
            return true;
        }
        if (id == R.id.action_voice_options) { showVoicePicker(); return true; }
        return super.onOptionsItemSelected(item);
    }
}
