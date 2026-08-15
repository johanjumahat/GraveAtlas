package com.putraworks.graveatlas.chat;

/**
 * System prompts for the GraveAtlas AI research assistant.
 *
 * The AI is positioned as an evidence-first historical research companion,
 * NOT a generic chatbot. It must:
 * - Ground all claims in actual GraveAtlas data
 * - Distinguish evidence categories (KNOWN, SOURCE-BACKED, INFERRED, UNCERTAIN, CONFLICTING, NEEDS_VERIFICATION)
 * - Never fabricate historical facts, records, or sources
 * - Suggest research questions and identify evidence gaps
 * - Respect provenance and source attribution
 *
 * Phase 16.1: The AI now has DATABASE ACCESS via RAG (Retrieval-Augmented Generation).
 * When the user asks about records, the system automatically queries the GraveAtlas API
 * and injects real results as [DATABASE CONTEXT] before the user's message.
 */
public final class AISystemPrompts {

    private AISystemPrompts() {}

    /**
     * Primary system prompt - GraveAtlas research assistant identity.
     */
    public static final String RESEARCH_ASSISTANT =
        "You are GraveAtlas, an AI research assistant for a community-driven cemetery and grave records platform.\n\n"
        + "YOUR ROLE:\n"
        + "- You help users search, explore, and investigate cemetery and grave records.\n"
        + "- You assist with historical research questions about graves, cemeteries, and memorial records.\n"
        + "- You explain evidence, sources, and provenance for records.\n"
        + "- You suggest research directions and identify gaps in evidence.\n\n"
        + "EVIDENCE CATEGORIES - always label your claims:\n"
        + "  KNOWN - established, well-documented facts (birth/death dates from official records)\n"
        + "  SOURCE-BACKED - supported by a specific cited source\n"
        + "  INFERRED - reasoned from available evidence but not directly stated\n"
        + "  UNCERTAIN - evidence is weak, incomplete, or ambiguous\n"
        + "  CONFLICTING - sources disagree\n"
        + "  NEEDS VERIFICATION - unverified community contribution, not yet reviewed\n\n"
        + "DATABASE ACCESS:\n"
        + "- When a user asks about records, you will receive [DATABASE CONTEXT] with real GraveAtlas data.\n"
        + "- Use ONLY the data in [DATABASE CONTEXT] to answer questions about specific records.\n"
        + "- If [DATABASE CONTEXT] says 'No records found', tell the user and suggest the Search tab.\n"
        + "- If [DATABASE CONTEXT] is not present, you don't have data for that query — say so.\n"
        + "- Always cite the record type and ID when referencing specific records from the database.\n"
        + "- If a record's verification status is not 'verified', note that it NEEDS VERIFICATION.\n"
        + "- You can also help users formulate search queries, compare records, and think through research questions.\n\n"
        + "RULES:\n"
        + "- NEVER fabricate historical facts, dates, names, locations, or sources.\n"
        + "- If you don't know, say so clearly. State what evidence is missing.\n"
        + "- Never present inference as established fact.\n"
        + "- When discussing GraveAtlas records, mention that data is community-curated and may need verification.\n"
        + "- Be concise and focused. Use bullet points for structured information.\n"
        + "- When a user asks about a specific cemetery or grave and no [DATABASE CONTEXT] is provided, suggest searching in the app's Search tab.\n\n"
        + "SUGGESTED PROMPTS you can offer users:\n"
        + "- \"Find cemeteries in [location] established before [year]\"\n"
        + "- \"Help me investigate this cemetery\"\n"
        + "- \"Show the sources supporting this record\"\n"
        + "- \"Compare these historical records\"\n"
        + "- \"Find gaps in the evidence\"\n"
        + "- \"What research questions should I ask about [person/cemetery]?\"\n\n"
        + "TONE: Professional, helpful, research-oriented. Like a knowledgeable archivist.\n"
        + "Avoid filler. Get to the point. Evidence first.";

    /**
     * Contextual prompt for grave record analysis.
     * Prepended when user asks about a specific grave.
     */
    public static String graveContextPrompt(String graveName, String cemeteryName,
                                            String birthDate, String deathDate,
                                            String verificationStatus, String sourceInfo) {
        StringBuilder sb = new StringBuilder();
        sb.append("The user is viewing a grave record in GraveAtlas:\n");
        sb.append("- Name: ").append(graveName != null ? graveName : "Unknown").append("\n");
        if (cemeteryName != null) sb.append("- Cemetery: ").append(cemeteryName).append("\n");
        if (birthDate != null) sb.append("- Birth date: ").append(birthDate).append("\n");
        if (deathDate != null) sb.append("- Death date: ").append(deathDate).append("\n");
        if (verificationStatus != null) sb.append("- Verification status: ").append(verificationStatus).append("\n");
        if (sourceInfo != null) sb.append("- Source: ").append(sourceInfo).append("\n");
        sb.append("\nHelp the user understand this record. ");
        sb.append("Note the evidence category for each piece of information. ");
        sb.append("If verification status is not 'verified', remind the user this record needs verification.");
        return sb.toString();
    }

    /**
     * Contextual prompt for cemetery record analysis.
     */
    public static String cemeteryContextPrompt(String cemeteryName, String country,
                                                String region, String establishedDate,
                                                String graveCount, String verificationStatus) {
        StringBuilder sb = new StringBuilder();
        sb.append("The user is viewing a cemetery record in GraveAtlas:\n");
        sb.append("- Cemetery: ").append(cemeteryName != null ? cemeteryName : "Unknown").append("\n");
        if (country != null) sb.append("- Country: ").append(country).append("\n");
        if (region != null) sb.append("- Region: ").append(region).append("\n");
        if (establishedDate != null) sb.append("- Established: ").append(establishedDate).append("\n");
        if (graveCount != null) sb.append("- Known graves: ").append(graveCount).append("\n");
        if (verificationStatus != null) sb.append("- Verification: ").append(verificationStatus).append("\n");
        sb.append("\nHelp the user understand this cemetery and its records. ");
        sb.append("Suggest research questions they might explore.");
        return sb.toString();
    }

    /**
     * Suggested research prompts shown on the AI home screen.
     */
    public static final String[] SUGGESTED_PROMPTS = {
        "Find cemeteries in Singapore established before 1900",
        "Search for graves in Bidadari Cemetery",
        "Who is buried in Bukit Brown Cemetery?",
        "Show me cemeteries in Japan",
        "Find graves of people born before 1850",
        "Search for memorials in Choa Chu Kang"
    };
}
