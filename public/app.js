// ═══════════════════════════════════════════════════════════
//  LIFETRACE — App Controller (Conversational + Dashboard)
// ═══════════════════════════════════════════════════════════

const App = {
    apiBase: '',

    state: {
        sessionId: null,
        chapter: 1,
        answerCount: 0,
        chatHistory: [],
        analysis: null,
        isTyping: false,
        voiceInputActive: false,
        voiceOutputEnabled: true
    },

    chapters: {
        1: { title: "Setting the scene", dots: "●○○○", progress: 25 },
        2: { title: "The pressure", dots: "●●○○", progress: 50 },
        3: { title: "Your body's language", dots: "●●●○", progress: 75 },
        4: { title: "Connection", dots: "●●●●", progress: 100 }
    },

    dimensions: [
        { key: 'stress_resilience', label: 'Stress Resilience', color: '#7B6EF6' },
        { key: 'social_connectivity', label: 'Social Connectivity', color: '#4ECDC4' },
        { key: 'somatic_awareness', label: 'Somatic Awareness', color: '#E8906A' },
        { key: 'life_stability', label: 'Life Stability', color: '#FBBF24' },
        { key: 'recovery_capacity', label: 'Recovery Capacity', color: '#F87171' },
        { key: 'transition_adaptability', label: 'Adaptability', color: '#4ADE80' }
    ],

    openingMessage: "Before we look at your health, I want to understand your life. Not the medical version — the real one.\n\nLet's start simply: when you think about the last five years, what's the first word that comes to mind?",

    el: {},

    // ─── Initialization ───
    init() {
        this.cacheElements();
        this.bindEvents();
        this.initSpeechRecognition();
        this.showScreen('screen-landing');
    },

    cacheElements() {
        // Screens
        this.el.screens = {
            landing: document.getElementById('screen-landing'),
            interview: document.getElementById('screen-interview'),
            building: document.getElementById('screen-building'),
            results: document.getElementById('screen-results')
        };
        // Buttons
        this.el.btnBeginTrace = document.getElementById('btn-begin-trace');
        this.el.btnAbortInterview = document.getElementById('btn-abort-interview');
        this.el.btnRestartTrace = document.getElementById('btn-restart-trace');
        this.el.btnVoiceInput = document.getElementById('btn-voice-input');
        this.el.btnToggleVoiceOutput = document.getElementById('btn-toggle-voice-output');
        this.el.voiceWaveContainer = document.getElementById('voice-wave-container');
        // Chat
        this.el.chatForm = document.getElementById('chat-form');
        this.el.chatInput = document.getElementById('chat-input');
        this.el.chatSubmitBtn = document.getElementById('chat-submit-btn');
        this.el.chatMessages = document.getElementById('chat-messages');
        this.el.chatInputHint = document.getElementById('chat-input-hint');
        // Progress
        this.el.chapterNumberLabel = document.getElementById('chapter-number-label');
        this.el.chapterDots = document.getElementById('chapter-dots');
        this.el.chapterTitleLabel = document.getElementById('chapter-title-label');
        this.el.chapterProgressFill = document.getElementById('chapter-progress-fill');
        // Building
        this.el.timelineNodes = document.getElementById('timeline-nodes');
        this.el.buildingSubtitle = document.getElementById('building-subtitle');
        // Dashboard
        this.el.overallScoreRing = document.getElementById('overall-score-ring');
        this.el.overallScoreValue = document.getElementById('overall-score-value');
        this.el.metricBarsContainer = document.getElementById('metric-bars-container');
        this.el.riskLevelBadge = document.getElementById('risk-level-badge');
        this.el.riskDescription = document.getElementById('risk-description');
        this.el.dashTimeline = document.getElementById('dash-timeline-container');
        this.el.dashDominantPattern = document.getElementById('dash-dominant-pattern');
        this.el.dashPrimaryVuln = document.getElementById('dash-primary-vulnerability');
        this.el.statStrongest = document.getElementById('stat-strongest');
        this.el.statWeakest = document.getElementById('stat-weakest');
        this.el.statInsightsCount = document.getElementById('stat-insights-count');
        // Fingerprint
        this.el.radarChartContainer = document.getElementById('radar-chart-container');
        this.el.dominantArchetypeLabel = document.getElementById('dominant-archetype-label');
        this.el.primaryVulnerabilityLabel = document.getElementById('primary-vulnerability-label');
        this.el.dimensionLegend = document.getElementById('dimension-legend');
        // Insights
        this.el.insightsListContainer = document.getElementById('insights-list-container');
        this.el.interventionIntroLabel = document.getElementById('intervention-intro-label');
        this.el.interventionsListContainer = document.getElementById('interventions-list-container');
    },

    bindEvents() {
        this.el.btnBeginTrace.addEventListener('click', () => this.startNewTrace());
        this.el.btnAbortInterview.addEventListener('click', () => this.confirmAbort());
        this.el.btnRestartTrace.addEventListener('click', () => this.resetApp());
        this.el.btnVoiceInput.addEventListener('click', () => this.toggleVoiceInput());
        this.el.btnToggleVoiceOutput.addEventListener('click', () => this.toggleVoiceOutput());
        this.el.chatForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleUserSubmit(); });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
    },

    // ─── Screen Navigation ───
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId)?.classList.add('active');
    },

    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
        document.getElementById(tabId)?.classList.add('active');
    },

    // ─── Session Start ───
    async startNewTrace() {
        try {
            this.el.btnBeginTrace.querySelector('span').innerText = 'Initializing...';
            this.el.btnBeginTrace.disabled = true;

            const res = await fetch(`${this.apiBase}/api/session/start`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error("Failed to start session");
            const data = await res.json();

            this.state = { sessionId: data.sessionId, chapter: 1, answerCount: 0, chatHistory: [], analysis: null, isTyping: false };
            this.el.chatMessages.innerHTML = '';
            this.updateProgressUI();
            this.showScreen('screen-interview');

            // Show opening AI message with typewriter effect
            this.speak(this.openingMessage);
            await this.appendAIMessageAnimated(this.openingMessage);
            this.state.chatHistory.push({ role: 'model', content: this.openingMessage });

        } catch (err) {
            console.error(err);
            // Fallback to demo mode
            this.state = { sessionId: `demo_${Date.now()}`, chapter: 1, answerCount: 0, chatHistory: [], analysis: null, isTyping: false };
            this.el.chatMessages.innerHTML = '';
            this.updateProgressUI();
            this.showScreen('screen-interview');
            this.speak(this.openingMessage);
            await this.appendAIMessageAnimated(this.openingMessage);
            this.state.chatHistory.push({ role: 'model', content: this.openingMessage });
        } finally {
            this.el.btnBeginTrace.querySelector('span').innerText = 'Begin your trace';
            this.el.btnBeginTrace.disabled = false;
        }
    },

    confirmAbort() {
        if (confirm("End this session? Your progress will be lost.")) this.resetApp();
    },

    resetApp() {
        this.state = { sessionId: null, chapter: 1, answerCount: 0, chatHistory: [], analysis: null, isTyping: false, voiceInputActive: false, voiceOutputEnabled: true };
        this.showScreen('screen-landing');
        window.speechSynthesis.cancel();
    },

    // ─── Voice / Speech Features ───
    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech Recognition not supported in this browser.");
            if (this.el.btnVoiceInput) this.el.btnVoiceInput.style.display = 'none';
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.state.voiceInputActive = true;
            this.el.btnVoiceInput.classList.add('recording');
            this.el.voiceWaveContainer.classList.remove('hidden');
            this.el.chatInput.placeholder = "Listening...";
        };

        this.recognition.onend = () => {
            this.state.voiceInputActive = false;
            this.el.btnVoiceInput.classList.remove('recording');
            this.el.voiceWaveContainer.classList.add('hidden');
            this.el.chatInput.placeholder = "Share your thoughts...";
        };

        this.recognition.onresult = (event) => {
            const resultText = event.results[0][0].transcript;
            this.el.chatInput.value = resultText;
            this.el.chatInputHint.innerText = "Heard: " + resultText;

            // Automatically submit after a brief delay
            setTimeout(() => {
                this.handleUserSubmit();
            }, 800);
        };

        this.recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            this.state.voiceInputActive = false;
            this.el.btnVoiceInput.classList.remove('recording');
            this.el.voiceWaveContainer.classList.add('hidden');
            this.el.chatInput.placeholder = "Share your thoughts...";
        };
    },

    toggleVoiceInput() {
        if (!this.recognition) return;
        if (this.state.voiceInputActive) {
            this.recognition.stop();
        } else {
            // Cancel TTS when user starts speaking to avoid cross-talk
            window.speechSynthesis.cancel();
            this.recognition.start();
        }
    },

    toggleVoiceOutput() {
        this.state.voiceOutputEnabled = !this.state.voiceOutputEnabled;
        if (this.state.voiceOutputEnabled) {
            this.el.btnToggleVoiceOutput.classList.remove('muted');
        } else {
            this.el.btnToggleVoiceOutput.classList.add('muted');
            window.speechSynthesis.cancel();
        }
    },

    speak(text) {
        if (!this.state.voiceOutputEnabled) return;
        window.speechSynthesis.cancel();

        // Clean formatting tags, placeholders, or completed tokens
        const cleanText = text.replace(/\[INTERVIEW_COMPLETE\]/g, '').replace(/\[Demo Mode\]/g, '').replace(/\[Demo Mode \(No API Key\)\]/g, '').trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Find suitable voice (prefer Google US English or standard English)
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(v => v.lang.includes('en-US') && v.name.includes('Google')) ||
            voices.find(v => v.lang.includes('en-US')) ||
            voices.find(v => v.lang.includes('en'));
        if (enVoice) utterance.voice = enVoice;

        utterance.rate = 1.05; // slightly faster pace for conversational style
        window.speechSynthesis.speak(utterance);
    },

    // ─── Progress UI ───
    updateProgressUI() {
        const info = this.chapters[this.state.chapter];
        if (!info) return;
        this.el.chapterNumberLabel.innerText = `Chapter ${this.state.chapter} of 4`;
        this.el.chapterDots.innerText = info.dots;
        this.el.chapterTitleLabel.innerText = info.title;
        this.el.chapterProgressFill.style.width = `${info.progress}%`;
    },

    // ─── Chat Message Rendering ───
    getTimeString() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    createAIAvatar() {
        const avatar = document.createElement('div');
        avatar.className = 'ai-avatar';
        avatar.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;
        return avatar;
    },

    appendUserMessage(content) {
        const row = document.createElement('div');
        row.className = 'message-row user';
        row.innerHTML = `
            <div>
                <div class="message-bubble">${this.escapeHtml(content)}</div>
                <div class="message-time">${this.getTimeString()}</div>
            </div>`;
        this.el.chatMessages.appendChild(row);
        this.scrollToBottom();
    },

    async appendAIMessageAnimated(content) {
        const row = document.createElement('div');
        row.className = 'message-row ai';

        const avatar = this.createAIAvatar();
        const wrapper = document.createElement('div');
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        const timeEl = document.createElement('div');
        timeEl.className = 'message-time';
        timeEl.innerText = this.getTimeString();

        wrapper.appendChild(bubble);
        wrapper.appendChild(timeEl);
        row.appendChild(avatar);
        row.appendChild(wrapper);
        this.el.chatMessages.appendChild(row);
        this.scrollToBottom();

        // Typewriter effect
        const cursor = document.createElement('span');
        cursor.className = 'typewriter-cursor';
        bubble.appendChild(cursor);

        const lines = content.split('\n');
        for (let li = 0; li < lines.length; li++) {
            if (li > 0) bubble.insertBefore(document.createElement('br'), cursor);
            const chars = lines[li];
            for (let ci = 0; ci < chars.length; ci++) {
                bubble.insertBefore(document.createTextNode(chars[ci]), cursor);
                if (ci % 3 === 0) { // Throttle to every 3 chars for speed
                    await this.sleep(12);
                    this.scrollToBottom();
                }
            }
        }
        cursor.remove();
        this.scrollToBottom();
    },

    appendTypingIndicator() {
        const row = document.createElement('div');
        row.className = 'message-row ai temp-typing';
        const avatar = this.createAIAvatar();
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.innerHTML = `<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
        row.appendChild(avatar);
        row.appendChild(bubble);
        this.el.chatMessages.appendChild(row);
        this.scrollToBottom();
        return row;
    },

    scrollToBottom() {
        this.el.chatMessages.scrollTop = this.el.chatMessages.scrollHeight;
    },

    // ─── Chat Submission ───
    async handleUserSubmit() {
        const text = this.el.chatInput.value.trim();
        if (!text || this.state.isTyping) return;

        this.el.chatInput.value = '';
        this.appendUserMessage(text);
        this.state.chatHistory.push({ role: 'user', content: text });
        this.state.isTyping = true;
        this.el.chatInput.disabled = true;
        this.el.chatSubmitBtn.disabled = true;
        this.el.chatInputHint.innerText = 'LifeTrace is thinking...';

        const typingEl = this.appendTypingIndicator();

        try {
            let reply, isComplete;

            if (this.state.sessionId.startsWith('demo_')) {
                await this.sleep(800 + Math.random() * 1200);
                ({ reply, isComplete } = this.getDemoResponse());
            } else {
                const res = await fetch(`${this.apiBase}/api/interview/message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: this.state.sessionId, userMessage: text })
                });
                if (!res.ok) throw new Error("Message send failed");
                const data = await res.json();
                reply = data.response;
                isComplete = data.isComplete;
                this.state.chapter = data.chapter;
                this.state.answerCount = data.answerCount;
            }

            typingEl.remove();
            this.speak(reply);
            await this.appendAIMessageAnimated(reply);
            this.state.chatHistory.push({ role: 'model', content: reply });
            this.updateProgressUI();

            if (isComplete) {
                await this.sleep(1200);
                this.startTimelineAnalysis();
            }
        } catch (err) {
            console.error(err);
            typingEl.remove();
            await this.appendAIMessageAnimated("I'm having trouble connecting. Could you try again?");
        } finally {
            this.state.isTyping = false;
            this.el.chatInput.disabled = false;
            this.el.chatSubmitBtn.disabled = false;
            this.el.chatInputHint.innerText = 'Press Enter to send';
            this.el.chatInput.focus();
        }
    },

    getDemoResponse() {
        const history = this.state.chatHistory;
        const lastUserMsg = history[history.length - 1]?.content || "";
        const msgClean = lastUserMsg.trim().lower();

        const greetings = ["hi", "hello", "hey", "yo", "sup", "testing", "test", "is anyone there", "status", "hi lifetrace", "hi there"];
        const isGreeting = greetings.includes(msgClean);

        const mockQuestions = [
            "Before we look at your health, I want to understand your life. Not the medical version — the real one. Let's start simply: when you think about the last five years, what's the first word that comes to mind?",
            "Walk me through the biggest change in your life since 2020.",
            "How many times have you moved—cities, jobs, relationships—in the last decade?",
            "When did you last feel like you were exactly where you were supposed to be?",
            "Now let's talk about pressure. When something really difficult happens, what's your first instinct?",
            "Do you tend to push through alone, or do you reach out to people?",
            "Think of a time you got sick. What was happening in your life around then?",
            "What's your relationship with rest—do you feel you deserve it?",
            "Where in your body do you notice stress first?",
            "Do you have any recurring physical complaints? When did they start?",
            "Who do you call when things get hard?",
            "What's your relationship with asking for help?"
        ];
        // Find last question asked by AI in history using signatures
        const signatures = [
            "word that comes to mind",
            "biggest change in your life",
            "have you moved",
            "exactly where you were supposed to be",
            "first instinct",
            "push through alone",
            "time you got sick",
            "relationship with rest",
            "notice stress first",
            "recurring physical complaints",
            "who do you call",
            "asking for help"
        ];
        let lastQIdx = -1;
        for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].role === 'model') {
                const content = history[i].content.toLowerCase();
                for (let j = 0; j < signatures.length; j++) {
                    if (content.includes(signatures[j])) {
                        lastQIdx = j;
                        break;
                    }
                }
                if (lastQIdx !== -1) break;
            }
        }

        if (lastQIdx === -1) {
            return { reply: mockQuestions[0], isComplete: false };
        }

        if (isGreeting) {
            const greetingReplies = [
                "Hello! Let's get started on your trace. What's the first word that comes to mind when you look back at the last 5 years?",
                `Hi there. I want to make sure I understand your story correctly. My question was:\n\n${mockQuestions[lastQIdx]}`
            ];
            const reply = lastQIdx === 0 ? greetingReplies[0] : greetingReplies[1];
            return { reply: reply, isComplete: false };
        }

        const nextIdx = lastQIdx + 1;
        if (nextIdx < mockQuestions.length) {
            const chaptersMap = { 0: 1, 1: 1, 2: 1, 3: 2, 4: 2, 5: 2, 6: 3, 7: 3, 8: 3, 9: 4, 10: 4, 11: 4 };
            this.state.chapter = chaptersMap[nextIdx] || 1;
            this.state.answerCount = nextIdx;

            const transitions = {
                1: `'${lastUserMsg}' is a powerful descriptor. Let's expand on that: Walk me through the biggest change in your life since 2020.`,
                2: `Change often brings unexpected transitions. How many times have you moved—cities, jobs, relationships—in the last decade?`,
                3: `Stability plays a massive role in somatic wellness. When did you last feel like you were exactly where you were supposed to be?`,
                4: `That sense of alignment is an important baseline. Let's talk about pressure: when something difficult happens, what's your first instinct?`,
                5: `Acknowledging that instinct is key. Do you tend to push through alone, or do you reach out to people?`,
                6: `Pushing through alone is a common high-drive adaptation. Think of a time you got sick in the last few years. What was happening in your life around then?`,
                7: `Yes, the timing of illness often reveals hidden cortisol load. What's your relationship with rest—do you feel you deserve it?`,
                8: `Rest is often the first thing we compromise when things get busy. Where in your body do you notice stress first?`,
                9: `Your shoulders and neck carry a lot of physical load. Do you have any recurring physical complaints? When did they start?`,
                10: `Those somatic warnings have a clear timeline. Let's look at social factors: who do you call when things get hard?`,
                11: `Having those connections is a core safety net. Final question: what's your relationship with asking for help?`
            };

            const reply = transitions[nextIdx] || mockQuestions[nextIdx];
            return { reply: reply, isComplete: false };
        } else {
            return {
                reply: "Thank you — I have what I need to build your trace.",
                isComplete: true
            };
        }
    },

    // ─── Timeline & Analysis ───
    async startTimelineAnalysis() {
        this.showScreen('screen-building');
        this.el.buildingSubtitle.style.opacity = '0';
        this.el.timelineNodes.innerHTML = '';

        try {
            let analysisData;
            if (this.state.sessionId.startsWith('demo_')) {
                await this.sleep(3500);
                analysisData = this.getMockAnalysis();
            } else {
                const res = await fetch(`${this.apiBase}/api/analysis/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: this.state.sessionId })
                });
                if (!res.ok) throw new Error("Analysis failed");
                analysisData = await res.json();
            }

            this.state.analysis = analysisData;
            this.renderTimelineNodes(analysisData.timeline_events);
            const animMs = (analysisData.timeline_events.length * 0.4 + 1.5) * 1000;
            await this.sleep(Math.max(animMs, 4000));

            this.populateDashboard();
            this.populateFingerprintTab();
            this.populateInsightsTab();
            this.switchTab('tab-dashboard');
            this.showScreen('screen-results');

            // Trigger dashboard animations after screen is visible
            requestAnimationFrame(() => {
                setTimeout(() => this.animateDashboard(), 200);
            });

        } catch (err) {
            console.error(err);
            alert("Analysis failed. Let's try again.");
            this.resetApp();
        }
    },

    renderTimelineNodes(events) {
        if (!events?.length) return;
        events.sort((a, b) => a.year - b.year);
        events.forEach((ev, idx) => {
            const pct = events.length > 1 ? (idx / (events.length - 1)) * 80 + 10 : 50;
            const node = document.createElement('div');
            node.className = `timeline-anim-node node-${ev.type || 'general'}`;
            node.style.left = `${pct}%`;
            node.style.animationDelay = `${idx * 0.4 + 0.8}s`;
            node.innerHTML = `<div class="timeline-node-dot"></div><div class="timeline-node-label">${ev.event} <span class="timeline-node-year">· ${ev.year}</span></div>`;
            this.el.timelineNodes.appendChild(node);
        });
    },

    // ─── Dashboard Population ───
    populateDashboard() {
        const { fingerprint_scores: scores, dominant_pattern, primary_vulnerability, insights, timeline_events } = this.state.analysis;

        // Dominant pattern
        this.el.dashDominantPattern.innerText = dominant_pattern;
        this.el.dashPrimaryVuln.innerText = primary_vulnerability;

        // Metric bars (pre-fill at 0%, will animate later)
        this.el.metricBarsContainer.innerHTML = '';
        this.dimensions.forEach(dim => {
            const score = scores[dim.key] ?? 50;
            const row = document.createElement('div');
            row.className = 'metric-bar-row';
            row.innerHTML = `
                <span class="metric-bar-label">${dim.label}</span>
                <div class="metric-bar-track">
                    <div class="metric-bar-fill" data-target="${score}" style="width:0%;background:${dim.color};"></div>
                </div>
                <span class="metric-bar-value">${score}</span>`;
            this.el.metricBarsContainer.appendChild(row);
        });

        // Risk assessment
        const values = Object.values(scores);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const minScore = Math.min(...values);
        let riskLevel, riskClass, riskText;
        if (minScore < 30) {
            riskLevel = 'ELEVATED'; riskClass = 'risk-elevated';
            riskText = 'One or more dimensions show critically low scores. Targeted interventions recommended.';
        } else if (avg < 55) {
            riskLevel = 'MODERATE'; riskClass = 'risk-moderate';
            riskText = 'Several behavioral patterns indicate areas for proactive attention and adjustment.';
        } else {
            riskLevel = 'LOW'; riskClass = 'risk-low';
            riskText = 'Your behavioral patterns suggest a generally resilient profile with manageable stress levels.';
        }
        this.el.riskLevelBadge.innerText = riskLevel;
        this.el.riskLevelBadge.className = `risk-level-badge ${riskClass}`;
        this.el.riskDescription.innerText = riskText;

        // Mini timeline
        this.el.dashTimeline.innerHTML = '';
        (timeline_events || []).forEach(ev => {
            const colorMap = { transition: '#7B6EF6', health: '#E8906A', social: '#4ECDC4', general: '#6B6A72' };
            const item = document.createElement('div');
            item.className = 'dash-timeline-item';
            item.innerHTML = `
                <div class="dash-timeline-dot" style="background:${colorMap[ev.type] || '#6B6A72'}"></div>
                <div><div class="dash-timeline-text">${ev.event}</div><div class="dash-timeline-year">${ev.year}</div></div>`;
            this.el.dashTimeline.appendChild(item);
        });

        // Quick stats
        const sorted = this.dimensions.map(d => ({ label: d.label, score: scores[d.key] ?? 50 })).sort((a, b) => b.score - a.score);
        this.el.statStrongest.innerText = sorted[0]?.label || '—';
        this.el.statWeakest.innerText = sorted[sorted.length - 1]?.label || '—';
        this.el.statInsightsCount.innerText = insights?.length || 0;

        // Overall score value (will animate)
        this.el.overallScoreValue.innerText = '0';
    },

    animateDashboard() {
        const scores = this.state.analysis.fingerprint_scores;
        const values = Object.values(scores);
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

        // Animate score ring
        const circumference = 2 * Math.PI * 52; // r=52
        const offset = circumference * (1 - avg / 100);
        this.el.overallScoreRing.style.strokeDashoffset = offset;

        // Animate counter
        this.animateCounter(this.el.overallScoreValue, 0, avg, 1200);

        // Animate metric bar fills
        document.querySelectorAll('.metric-bar-fill').forEach(bar => {
            const target = bar.dataset.target;
            setTimeout(() => { bar.style.width = `${target}%`; }, 100);
        });
    },

    animateCounter(element, from, to, duration) {
        const start = performance.now();
        const update = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            element.innerText = Math.round(from + (to - from) * eased);
            if (progress < 1) requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    },

    // ─── Fingerprint Tab ───
    populateFingerprintTab() {
        const scores = this.state.analysis.fingerprint_scores;
        this.el.dominantArchetypeLabel.innerText = this.state.analysis.dominant_pattern;
        this.el.primaryVulnerabilityLabel.innerText = this.state.analysis.primary_vulnerability;
        this.drawRadarChart(scores);

        // Legend
        this.el.dimensionLegend.innerHTML = '';
        this.dimensions.forEach(dim => {
            const score = scores[dim.key] ?? 50;
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `<div class="legend-dot" style="background:${dim.color}"></div><span>${dim.label}</span><span class="legend-score">${score}/100</span>`;
            this.el.dimensionLegend.appendChild(item);
        });
    },

    drawRadarChart(scores) {
        const dims = this.dimensions;
        const W = 400, H = 400, cx = W / 2, cy = H / 2, R = 120;
        let svg = `<svg width="100%" height="100%" viewBox="0 0 ${W} ${H}">`;

        // Grid
        [0.2, 0.4, 0.6, 0.8, 1.0].forEach(t => {
            const r = R * t;
            const pts = Array.from({ length: 6 }, (_, i) => {
                const a = (i * Math.PI * 2) / 6 - Math.PI / 2;
                return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
            }).join(' ');
            svg += `<polygon class="radar-grid-line" points="${pts}" fill="none"/>`;
            svg += `<text class="radar-tick-label" x="${cx + 5}" y="${cy - r + 4}">${Math.round(t * 100)}</text>`;
        });

        // Axes, labels, score polygon
        const scorePoints = [];
        dims.forEach((dim, i) => {
            const a = (i * Math.PI * 2) / 6 - Math.PI / 2;
            const cos = Math.cos(a), sin = Math.sin(a);
            svg += `<line class="radar-axis-line" x1="${cx}" y1="${cy}" x2="${cx + R * cos}" y2="${cy + R * sin}"/>`;

            const s = (scores[dim.key] ?? 50) / 100 * R;
            scorePoints.push({ x: cx + s * cos, y: cy + s * sin });

            const lr = R + 24;
            const lx = cx + lr * cos, ly = cy + lr * sin;
            let anchor = 'middle';
            if (cos > 0.1) anchor = 'start';
            else if (cos < -0.1) anchor = 'end';
            let yOff = 4;
            if (sin < -0.9) yOff = -6;
            else if (sin > 0.9) yOff = 14;
            svg += `<text class="radar-axis-label" x="${lx}" y="${ly + yOff}" text-anchor="${anchor}">${dim.label}</text>`;
        });

        svg += `<polygon class="radar-poly" points="${scorePoints.map(p => `${p.x},${p.y}`).join(' ')}"/>`;
        scorePoints.forEach(p => { svg += `<circle class="radar-poly-point" cx="${p.x}" cy="${p.y}"/>`; });
        svg += `</svg>`;
        this.el.radarChartContainer.innerHTML = svg;
    },

    // ─── Insights Tab ───
    populateInsightsTab() {
        const { insights, interventions, dominant_pattern } = this.state.analysis;

        this.el.insightsListContainer.innerHTML = '';
        (insights || []).forEach(ins => {
            const card = document.createElement('div');
            card.className = 'insight-card';
            const bc = ins.confidence === 'strong' ? 'badge-strong' : 'badge-emerging';
            const bl = ins.confidence === 'strong' ? 'Strong signal' : 'Emerging pattern';
            card.innerHTML = `<span class="badge ${bc}">${bl}</span><h4 class="insight-headline">${ins.headline}</h4><p class="insight-explanation">${ins.explanation}</p>`;
            this.el.insightsListContainer.appendChild(card);
        });

        this.el.interventionIntroLabel.innerText = `Based on your "${dominant_pattern}" profile, here's what works for your type:`;
        this.el.interventionsListContainer.innerHTML = '';
        (interventions || []).forEach(item => {
            const li = document.createElement('li');
            li.className = 'intervention-item';
            li.innerText = item;
            this.el.interventionsListContainer.appendChild(li);
        });
    },

    // ─── Mock Analysis Data ───
    getMockAnalysis() {
        return {
            timeline_events: [
                { year: 2020, event: "Career Transition", type: "transition" },
                { year: 2021, event: "High Workload Period", type: "general" },
                { year: 2022, event: "Burnout & Fatigue", type: "health" },
                { year: 2023, event: "Relocated Cities", type: "transition" },
                { year: 2024, event: "New Social Circle", type: "social" }
            ],
            fingerprint_scores: {
                stress_resilience: 48,
                social_connectivity: 65,
                somatic_awareness: 38,
                life_stability: 55,
                recovery_capacity: 28,
                transition_adaptability: 72
            },
            dominant_pattern: "High-Drive, Low-Recovery",
            primary_vulnerability: "Sustained high cortisol combined with delayed somatic registration and insufficient recovery pacing creates a compounding vulnerability window around life transitions.",
            insights: [
                { headline: "Transitions trigger immune dips", explanation: "Physical complaints emerged within weeks of your 2020 career shift and 2023 relocation. Your body registers major change on a 6-8 week delay.", confidence: "strong" },
                { headline: "Isolation amplifies recovery deficit", explanation: "When pressure peaks, your instinct is to push through alone. This pattern directly correlates with disrupted sleep and lower physical resilience.", confidence: "strong" },
                { headline: "Delayed somatic feedback loop", explanation: "You process stress cognitively before your body signals overload — leading to sudden fatigue crashes rather than gradual warning signs.", confidence: "emerging" }
            ],
            interventions: [
                "Build a 48-hour decompression protocol for every major deadline or life change — your immune system needs this buffer.",
                "Schedule recovery blocks as non-negotiable calendar items. Your wiring overrides rest signals, so make rest a system, not a feeling.",
                "Run a 2-minute body scan twice daily. This bridges the gap between your mental drive and your body's actual stress load.",
                "Designate two 'co-regulation' contacts and agree to reach out before stress peaks — not after. Connection is preventive medicine for your type."
            ]
        };
    },

    // ─── Utilities ───
    sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
