package com.putraworks.graveatlas.chat;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import com.putraworks.graveatlas.R;

import java.util.ArrayList;
import java.util.List;

/**
 * RecyclerView adapter for chat messages.
 * User messages align right, AI messages align left.
 */
public class ChatAdapter extends RecyclerView.Adapter<ChatAdapter.MessageViewHolder> {

    private final List<ChatMessage> messages = new ArrayList<>();
    private Runnable onChangeListener;
    private OnMessageLongClickListener longClickListener;

    public interface OnMessageLongClickListener {
        void onLongClick(ChatMessage message);
    }

    /** Called after any mutation (add/update/clear) — used to persist history. */
    public void setOnChangeListener(Runnable listener) {
        this.onChangeListener = listener;
    }

    /** Called when a message bubble is long-pressed — used to show copy options. */
    public void setOnMessageLongClickListener(OnMessageLongClickListener listener) {
        this.longClickListener = listener;
    }

    public void addMessage(ChatMessage message) {
        messages.add(message);
        notifyItemInserted(messages.size() - 1);
        notifyChanged();
    }

    public void updateLastMessage(String content) {
        if (!messages.isEmpty()) {
            ChatMessage last = messages.get(messages.size() - 1);
            messages.set(messages.size() - 1, new ChatMessage(content, false));
            notifyItemChanged(messages.size() - 1);
            notifyChanged();
        }
    }

    public void clear() {
        messages.clear();
        notifyDataSetChanged();
        notifyChanged();
    }

    /** Restore a previously-saved history without triggering persistence (avoids re-save loop). */
    public void restoreMessages(List<ChatMessage> saved) {
        messages.clear();
        messages.addAll(saved);
        notifyDataSetChanged();
    }

    private void notifyChanged() {
        if (onChangeListener != null) onChangeListener.run();
    }

    public List<ChatMessage> getMessages() {
        return new ArrayList<>(messages);
    }

    @NonNull
    @Override
    public MessageViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_chat_message, parent, false);
        return new MessageViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull MessageViewHolder holder, int position) {
        ChatMessage msg = messages.get(position);
        holder.bind(msg);
        holder.itemView.setOnLongClickListener(v -> {
            if (longClickListener != null) longClickListener.onLongClick(msg);
            return true;
        });
    }

    @Override
    public int getItemCount() {
        return messages.size();
    }

    static class MessageViewHolder extends RecyclerView.ViewHolder {
        TextView tvMessage;
        View container;

        MessageViewHolder(@NonNull View itemView) {
            super(itemView);
            container = itemView;
            tvMessage = itemView.findViewById(R.id.tvMessage);
        }

        void bind(ChatMessage msg) {
            tvMessage.setText(msg.getContent());

            if (msg.isUser()) {
                // User message — right aligned, primary background
                container.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
                tvMessage.setBackgroundResource(R.drawable.bg_msg_user);
                tvMessage.setTextColor(0xFFFFFFFF);
            } else if (msg.isError()) {
                // Error message — left aligned, error background
                container.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
                tvMessage.setBackgroundResource(R.drawable.bg_msg_error);
                tvMessage.setTextColor(0xFFD32F2F);
            } else {
                // AI message — left aligned, card background
                container.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);
                tvMessage.setBackgroundResource(R.drawable.bg_msg_ai);
                tvMessage.setTextColor(0xFF202124);
            }
        }
    }
}
