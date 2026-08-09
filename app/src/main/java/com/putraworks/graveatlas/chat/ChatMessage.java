package com.putraworks.graveatlas.chat;

/**
 * Data model for a single chat message.
 */
public class ChatMessage {
    private String content;
    private boolean isUser;
    private long timestamp;
    private boolean isError;

    public ChatMessage(String content, boolean isUser) {
        this.content = content;
        this.isUser = isUser;
        this.timestamp = System.currentTimeMillis();
        this.isError = false;
    }

    public ChatMessage(String content, boolean isUser, boolean isError) {
        this.content = content;
        this.isUser = isUser;
        this.timestamp = System.currentTimeMillis();
        this.isError = isError;
    }

    public String getContent() { return content; }
    public boolean isUser() { return isUser; }
    public long getTimestamp() { return timestamp; }
    public boolean isError() { return isError; }
}
