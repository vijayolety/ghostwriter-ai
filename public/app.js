const panels = {
    write: document.querySelector("#writePanel"),
    loading: document.querySelector("#loadingPanel"),
    preview: document.querySelector("#previewPanel"),
    settings: document.querySelector("#settingsPanel"),
};

const draftForm = document.querySelector("#draftForm");
const settingsForm = document.querySelector("#settingsForm");
const promptInput = document.querySelector("#promptInput");
const toneSelect = document.querySelector("#toneSelect");
const draftPreview = document.querySelector("#draftPreview");
const statusMessage = document.querySelector("#statusMessage");
const settingsToggle = document.querySelector("#settingsToggle");
const themeToggle = document.querySelector("#themeToggle");
const downloadTxt = document.querySelector("#downloadTxt");
const downloadDoc = document.querySelector("#downloadDoc");
const regenerateDraft = document.querySelector("#regenerateDraft");
const apiKeyInput = document.querySelector("#apiKeyInput");
const modelSelect = document.querySelector("#modelSelect");
const providerSelect = document.querySelector("#providerSelect");
const useMockToggle = document.querySelector("#useMockToggle");
const backFromPreview = document.querySelector("#backFromPreview");
const backFromSettings = document.querySelector("#backFromSettings");

const storageKey = "ai-ghostwriter-settings";
let latestDraft = "";
let lastPrompt = "";

function showPanel(name, direction = "forward") {
    // Remove active class from all panels
    Object.values(panels).forEach((panel) => {
        panel.classList.remove("is-active");
        panel.classList.remove("slide-left");
    });

    // Add active class to target panel
    panels[name].classList.add("is-active");

    // Add slide direction for transition effect
    if (direction === "back") {
        panels[name].classList.add("slide-left");
    }
}

let statusTimeout = null;

function setStatus(message, isError = false) {
    // Clear any existing timeout
    if (statusTimeout) {
        clearTimeout(statusTimeout);
    }

    statusMessage.textContent = message;
    statusMessage.classList.toggle("is-error", isError);

    // Auto-clear success messages after 4 seconds
    if (message && !isError) {
        statusTimeout = setTimeout(() => {
            statusMessage.textContent = "";
            statusMessage.classList.remove("is-error");
        }, 4000);
    }
}

function loadSettings() {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    apiKeyInput.value = saved.apiKey || "";
    providerSelect.value = saved.provider || "openai";
    // Update model options BEFORE setting the saved model
    updateModelOptions();
    // Now set the saved model (if it exists and is valid for the provider)
    if (saved.model && modelSelect.querySelector(`option[value="${saved.model}"]`)) {
        modelSelect.value = saved.model;
    }
    // Auto-disable mock mode when API key exists
    useMockToggle.checked = saved.apiKey ? false : (saved.useMock ?? true);
    document.body.classList.toggle("light", saved.theme === "light");
}

function saveSettings() {
    const settings = {
        apiKey: apiKeyInput.value.trim(),
        model: modelSelect.value,
        provider: providerSelect.value,
        useMock: useMockToggle.checked,
        theme: document.body.classList.contains("dark") ? "dark" : "light",
    };

    localStorage.setItem(storageKey, JSON.stringify(settings));
    return settings;
}

function updateModelOptions() {
    const provider = providerSelect.value;
    const models = {
        openai: [
            { value: "gpt-3.5-turbo", label: "gpt-3.5-turbo" },
            { value: "gpt-4.1", label: "gpt-4.1" },
            { value: "gpt-4o-mini", label: "gpt-4o-mini" },
        ],
        gemini: [
            { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
            { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
            { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
        ],
        xai: [
            { value: "grok-2-1212", label: "Grok-2" },
            { value: "grok-2-mini", label: "Grok-2 Mini" },
            { value: "grok-beta", label: "Grok Beta" },
        ],
        groq: [
            { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Versatile)" },
            { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B (Instant)" },
            { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
        ],
    };

    modelSelect.innerHTML = "";
    models[provider].forEach((m) => {
        const option = document.createElement("option");
        option.value = m.value;
        option.textContent = m.label;
        modelSelect.appendChild(option);
    });

    // Set default model for provider
    if (provider === "openai") {
        modelSelect.value = "gpt-3.5-turbo";
    } else if (provider === "gemini") {
        modelSelect.value = "gemini-2.0-flash";
    } else if (provider === "xai") {
        modelSelect.value = "grok-2-1212";
    } else if (provider === "groq") {
        modelSelect.value = "llama-3.3-70b-versatile";
    }
}

function getSettings() {
    return JSON.parse(localStorage.getItem(storageKey) || "{}");
}

async function callGenerationApi(prompt, tone, settings) {
    const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            prompt,
            tone,
            provider: settings.provider,
            model: settings.model,
            apiKey: settings.apiKey
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Generation failed");
    return data.text;
}

function generateDemoDraft(prompt, tone) {
    const cleanPrompt = prompt.trim();
    const title = cleanPrompt.split(/[.\n]/).find(Boolean)?.slice(0, 72) || "Untitled Draft";

    return `Project Draft: ${title}

This ${tone.toLowerCase()} draft expands your outline into a structured first pass that can be refined for publication, email, proposal, or article use.

The core idea is straightforward: ${cleanPrompt}

To make the piece stronger, the draft should open with the reader's problem, explain why the topic matters now, and then move into the main recommendation with specific details. Each section should build naturally from the previous one, keeping the language direct and useful.

Suggested next section:
Add examples, supporting points, or customer-facing details that make the draft feel specific to its intended audience.

Closing:
This gives you a usable starting point while leaving room for final edits, brand voice, and factual review.`;
}

async function generateDraft(prompt = promptInput.value, tone = toneSelect.value) {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
        setStatus("Enter an outline or prompt first.", true);
        return;
    }

    lastPrompt = trimmedPrompt;
    saveSettings();
    const settings = getSettings();

    showPanel("loading");
    setStatus("");

    try {
        const shouldUseDemo = settings.useMock || !settings.apiKey;

        console.log("Generating draft with settings:", {
            provider: settings.provider,
            model: settings.model,
            hasApiKey: !!settings.apiKey,
            useMock: settings.useMock
        });

        if (shouldUseDemo) {
            latestDraft = await new Promise((resolve) => setTimeout(() => resolve(generateDemoDraft(trimmedPrompt, tone)), 1200));
        } else {
            latestDraft = await callGenerationApi(trimmedPrompt, tone, settings);
        }

        draftPreview.textContent = latestDraft;
        showPanel("preview");
        setStatus(shouldUseDemo ? "Demo draft generated. Add an API key in settings for live AI output." : "Draft generated.", false);
    } catch (error) {
        console.error("Full error details:", error);
        showPanel("write", "back");
        
        let msg = "Generation failed. Please try again.";
        const err = error.message.toLowerCase();

        if (err.includes("quota") || err.includes("rate limit") || err.includes("429")) {
            msg = "AI is currently busy or quota exceeded. Please try again in a moment.";
        } else if (err.includes("api key") || err.includes("invalid") || err.includes("401")) {
            msg = "Invalid API Key. Please check your settings and try again.";
        } else if (err.includes("safety") || err.includes("blocked")) {
            msg = "The content was flagged by safety filters. Please try a different prompt.";
        } else if (err.includes("fetch") || err.includes("network")) {
            msg = "Network error. Check your internet connection or server status.";
        }

        setStatus(msg, true);
    }
}

function downloadFile(extension, mimeType) {
    if (!latestDraft) {
        setStatus("Generate a draft before downloading.", true);
        return;
    }

    const blob = new Blob([latestDraft], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ai-ghostwriter-draft.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`Downloaded ${extension.toUpperCase()} file.`, false);
}

draftForm.addEventListener("submit", (event) => {
    event.preventDefault();
    generateDraft();
});

settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveSettings();
    showPanel("write");
    setStatus("Settings saved.", false);
});

providerSelect.addEventListener("change", () => {
    updateModelOptions();
});

settingsToggle.addEventListener("click", () => {
    showPanel(panels.settings.classList.contains("is-active") ? "write" : "settings");
    setStatus("");
});

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light");
    saveSettings();
});

downloadTxt.addEventListener("click", () => downloadFile("txt", "text/plain;charset=utf-8"));
downloadDoc.addEventListener("click", () => downloadFile("doc", "application/msword;charset=utf-8"));
regenerateDraft.addEventListener("click", () => generateDraft(lastPrompt || promptInput.value, toneSelect.value));

backFromPreview.addEventListener("click", () => {
    showPanel("write", "back");
    setStatus("");
});

backFromSettings.addEventListener("click", () => {
    showPanel("write", "back");
    setStatus("");
});

loadSettings();
