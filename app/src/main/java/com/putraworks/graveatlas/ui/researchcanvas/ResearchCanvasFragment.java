package com.putraworks.graveatlas.ui.researchcanvas;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.putraworks.graveatlas.data.api.ApiClient;
import com.putraworks.graveatlas.data.api.LocalCache;
import com.putraworks.graveatlas.data.model.GraveRecord;
import com.putraworks.graveatlas.data.model.RelatedRecords;
import com.putraworks.graveatlas.ui.researchcanvas.ResearchGraph.GraphNode;
import com.putraworks.graveatlas.ui.researchcanvas.ResearchGraph.GraphEdge;
import com.putraworks.graveatlas.ui.researchcanvas.ResearchGraph.NodeType;

import java.util.List;
import java.util.Map;

/**
 * Research Canvas Fragment — visual graph of record relationships.
 *
 * Phase 16.5: Research Canvas — visual graph: PERSON → CEMETERY → RECORD → SOURCE.
 *
 * Displays a text-based graph representation showing:
 * - Central person with their record and cemetery
 * - Source references as evidence trail
 * - Nearby cemeteries and same-cemetery people
 * - Location hierarchy
 *
 * The user navigates by tapping nodes to expand the graph around them.
 */
public class ResearchCanvasFragment extends Fragment {

    private static final String ARG_RECORD_ID = "record_id";

    private LinearLayout contentLayout;
    private ProgressBar progressBar;
    private TextView statusText;
    private TextView summaryText;
    private ApiClient apiClient;
    private LocalCache cache;
    private String recordId;
    private ResearchGraph graph;

    public static ResearchCanvasFragment newInstance(String recordId) {
        ResearchCanvasFragment f = new ResearchCanvasFragment();
        Bundle args = new Bundle();
        args.putString(ARG_RECORD_ID, recordId);
        f.setArguments(args);
        return f;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            recordId = getArguments().getString(ARG_RECORD_ID);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, Bundle savedInstanceState) {
        LinearLayout layout = new LinearLayout(getContext());
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 64, 32, 32);

        apiClient = new ApiClient();
        cache = new LocalCache(getContext());

        // Title
        TextView title = new TextView(getContext());
        title.setText("🔍 Research Canvas");
        title.setTextSize(22f);
        title.setPadding(0, 0, 0, 24);
        layout.addView(title);

        // Summary text
        summaryText = new TextView(getContext());
        summaryText.setTextSize(14f);
        summaryText.setPadding(16, 16, 16, 16);
        summaryText.setVisibility(View.GONE);
        layout.addView(summaryText);

        // Progress
        progressBar = new ProgressBar(getContext());
        progressBar.setVisibility(View.VISIBLE);
        layout.addView(progressBar);

        // Status
        statusText = new TextView(getContext());
        statusText.setText("Loading research canvas...");
        statusText.setPadding(0, 16, 0, 16);
        layout.addView(statusText);

        // Content
        contentLayout = new LinearLayout(getContext());
        contentLayout.setOrientation(LinearLayout.VERTICAL);
        layout.addView(contentLayout);

        loadData();

        return layout;
    }

    private void loadData() {
        if (recordId == null) {
            statusText.setText("No record selected.");
            progressBar.setVisibility(View.GONE);
            return;
        }

        // Load the grave record using ApiClient.getGrave
        apiClient.getGrave(recordId, new ApiClient.ApiCallback<GraveRecord>() {
            @Override
            public void onSuccess(GraveRecord result) {
                if (result == null) {
                    showError("Record not found.");
                    return;
                }
                loadRelatedRecords(result);
            }

            @Override
            public void onError(String error) {
                // Try cache
                GraveRecord cached = cache.getRecord(recordId);
                if (cached != null) {
                    loadRelatedRecords(cached);
                } else {
                    showError("Unable to load record: " + error);
                }
            }
        });
    }

    private void loadRelatedRecords(GraveRecord grave) {
        apiClient.getRelatedRecords(grave.id, "grave", new ApiClient.ApiCallback<RelatedRecords>() {
            @Override
            public void onSuccess(RelatedRecords result) {
                RelatedRecords related = result != null ? result : new RelatedRecords();
                buildGraph(grave, related);
            }

            @Override
            public void onError(String error) {
                // Build graph without related data
                buildGraph(grave, new RelatedRecords());
            }
        });
    }

    private void buildGraph(GraveRecord grave, RelatedRecords related) {
        progressBar.setVisibility(View.GONE);
        statusText.setVisibility(View.GONE);

        graph = new ResearchGraph();
        graph.buildFromRecord(grave, related);

        // Display summary
        summaryText.setText(graph.getSummary());
        summaryText.setVisibility(View.VISIBLE);

        // Display graph
        displayGraph();

        // Update cache
        cache.saveRecord(grave);
    }

    private void displayGraph() {
        contentLayout.removeAllViews();

        if (graph == null) return;

        GraphNode center = graph.getCentralNode();
        if (center == null) {
            TextView empty = new TextView(getContext());
            empty.setText("No graph data available.");
            contentLayout.addView(empty);
            return;
        }

        // ── Central node card ──
        addSectionHeader("Central Entity");
        addNodeCard(center, true);

        // ── Connections ──
        List<GraphEdge> edges = graph.getEdgesForNode(center.id);
        if (!edges.isEmpty()) {
            addSectionHeader("Direct Connections");
            for (GraphEdge edge : edges) {
                String otherId = edge.fromId.equals(center.id) ? edge.toId : edge.fromId;
                GraphNode other = graph.getNode(otherId);
                if (other != null) {
                    addConnectionCard(edge, other);
                }
            }
        }

        // ── Graph Statistics ──
        Map<NodeType, Integer> counts = graph.getNodeCounts();
        addSectionHeader("Graph Statistics");
        for (NodeType nt : NodeType.values()) {
            int count = counts.get(nt);
            if (count > 0) {
                TextView stat = new TextView(getContext());
                stat.setText(nt.icon + " " + nt.label + ": " + count);
                stat.setPadding(16, 8, 16, 8);
                contentLayout.addView(stat);
            }
        }

        // ── Related persons ──
        List<GraphNode> allNodes = graph.getNodes();
        boolean hasPersons = false;
        for (GraphNode n : allNodes) {
            if (n.type == NodeType.PERSON && !n.id.equals(center.id)) {
                if (!hasPersons) {
                    addSectionHeader("Related Persons");
                    hasPersons = true;
                }
                addNodeCard(n, false);
            }
        }

        // ── Cemeteries ──
        boolean hasCemeteries = false;
        for (GraphNode n : allNodes) {
            if (n.type == NodeType.CEMETERY) {
                if (!hasCemeteries) {
                    addSectionHeader("Cemeteries");
                    hasCemeteries = true;
                }
                addNodeCard(n, false);
            }
        }

        // ── Sources ──
        boolean hasSources = false;
        for (GraphNode n : allNodes) {
            if (n.type == NodeType.SOURCE) {
                if (!hasSources) {
                    addSectionHeader("Source References");
                    hasSources = true;
                }
                addNodeCard(n, false);
            }
        }

        // ── Edge list ──
        List<GraphEdge> allEdges = graph.getEdges();
        if (!allEdges.isEmpty()) {
            addSectionHeader("All Connections (" + allEdges.size() + ")");
            for (GraphEdge e : allEdges) {
                GraphNode from = graph.getNode(e.fromId);
                GraphNode to = graph.getNode(e.toId);
                if (from != null && to != null) {
                    TextView edgeView = new TextView(getContext());
                    edgeView.setText("  " + from.type.icon + " " + truncate(from.title, 30)
                            + " →[" + e.label + "]→ "
                            + to.type.icon + " " + truncate(to.title, 30));
                    edgeView.setTextSize(12f);
                    edgeView.setPadding(16, 4, 16, 4);
                    contentLayout.addView(edgeView);
                }
            }
        }
    }

    private void addSectionHeader(String title) {
        TextView header = new TextView(getContext());
        header.setText(title);
        header.setTextSize(16f);
        header.setTypeface(header.getTypeface(), android.graphics.Typeface.BOLD);
        header.setPadding(0, 24, 0, 8);
        contentLayout.addView(header);
    }

    private void addNodeCard(GraphNode node, boolean isCenter) {
        LinearLayout card = new LinearLayout(getContext());
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(24, 16, 24, 16);

        if (isCenter) {
            card.setBackgroundColor(0xFFE3F2FD);
        } else {
            card.setBackgroundColor(0xFFF5F5F5);
        }

        TextView title = new TextView(getContext());
        title.setText(node.getDisplayText());
        title.setTextSize(16f);
        title.setTypeface(title.getTypeface(), android.graphics.Typeface.BOLD);
        card.addView(title);

        if (node.subtitle != null && !node.subtitle.isEmpty()) {
            TextView subtitle = new TextView(getContext());
            subtitle.setText(node.subtitle);
            subtitle.setTextSize(13f);
            card.addView(subtitle);
        }

        if (node.verificationStatus != null) {
            TextView status = new TextView(getContext());
            status.setText("Evidence: " + node.verificationStatus);
            status.setTextSize(12f);
            status.setPadding(0, 4, 0, 0);
            card.addView(status);
        }

        if (node.recordId != null) {
            card.setClickable(true);
            card.setOnClickListener(v -> {
                statusText.setText("Tap to view: " + node.title);
                statusText.setVisibility(View.VISIBLE);
            });

            card.setOnLongClickListener(v -> {
                showNodeDetails(node);
                return true;
            });
        }

        card.setContentDescription(node.type.label + ": " + node.title);
        contentLayout.addView(card);
    }

    private void addConnectionCard(GraphEdge edge, GraphNode target) {
        LinearLayout card = new LinearLayout(getContext());
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setPadding(24, 12, 24, 12);

        TextView icon = new TextView(getContext());
        icon.setText(target.type.icon);
        icon.setTextSize(18f);
        card.addView(icon);

        LinearLayout textCol = new LinearLayout(getContext());
        textCol.setOrientation(LinearLayout.VERTICAL);

        TextView name = new TextView(getContext());
        name.setText(target.title);
        name.setTextSize(14f);
        name.setTypeface(name.getTypeface(), android.graphics.Typeface.BOLD);
        textCol.addView(name);

        TextView rel = new TextView(getContext());
        rel.setText("[" + edge.label + "]");
        rel.setTextSize(12f);
        textCol.addView(rel);

        if (target.subtitle != null && !target.subtitle.isEmpty()) {
            TextView sub = new TextView(getContext());
            sub.setText(target.subtitle);
            sub.setTextSize(12f);
            textCol.addView(sub);
        }

        card.addView(textCol);

        card.setClickable(true);
        card.setOnClickListener(v -> showNodeDetails(target));

        contentLayout.addView(card);
    }

    private void showNodeDetails(GraphNode node) {
        StringBuilder details = new StringBuilder();
        details.append("Node Details\n\n");
        details.append("Type: ").append(node.type.icon).append(" ").append(node.type.label).append("\n");
        details.append("Title: ").append(node.title).append("\n");
        if (node.subtitle != null && !node.subtitle.isEmpty()) {
            details.append("Subtitle: ").append(node.subtitle).append("\n");
        }
        if (node.recordId != null) {
            details.append("Record ID: ").append(node.recordId).append("\n");
        }
        if (node.verificationStatus != null) {
            details.append("Evidence: ").append(node.verificationStatus).append("\n");
        }
        if (node.latitude != null && node.longitude != null) {
            details.append("Location: ").append(node.latitude).append(", ").append(node.longitude).append("\n");
        }

        List<GraphNode> neighbors = graph.getNeighbors(node.id);
        if (!neighbors.isEmpty()) {
            details.append("\nConnected to:\n");
            for (GraphNode n : neighbors) {
                details.append("  ").append(n.type.icon).append(" ").append(n.title).append("\n");
            }
        }

        statusText.setText(details.toString());
        statusText.setVisibility(View.VISIBLE);
    }

    private void showError(String message) {
        progressBar.setVisibility(View.GONE);
        statusText.setText("❌ " + message);
    }

    private static String truncate(String text, int maxLen) {
        if (text == null) return "";
        return text.length() > maxLen ? text.substring(0, maxLen) + "..." : text;
    }
}
