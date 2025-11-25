import quizData from './data.js';

// Display Screen Controller
class DisplayScreen {
    constructor() {
        this.currentDisplayMode = 'banner';
        this.celebrationActive = false;
        this.timerInterval = null;
        this.init();
    }

    init() {
        this.initializeDisplay();
        this.setupDataListener();
        this.updateDisplay();
    }

    initializeDisplay() {
        // Apply initial settings
        this.applyColorSettings();
        
        // Hide all sections initially
        this.hideAllSections();
        
        // Show initial section based on display mode
        this.showSection(quizData.data.displayMode);
    }

    setupDataListener() {
        window.addEventListener('quizDataUpdated', (event) => {
            try {
                this.updateDisplay();
            } catch (error) {
                console.error('Error updating display from data event:', error);
            }
        });

        // Listen for team updates in real time
        window.addEventListener('quizTeamsUpdated', () => {
            try {
                this.updateScoreboardDisplay();
            } catch (error) {
                console.error('Error updating scoreboard from team event:', error);
            }
        });

        // Listen for topic question updates in real time
            window.addEventListener('quizTopicQuestionsUpdated', () => {
                try {
                    // If in topic round, update both topic selection UI and round controls
                    if (quizData.data.currentRound === 'topic') {
                        this.renderTopicSelection();
                        this.updateRoundDisplay();
                    }
                } catch (error) {
                    console.error('Error updating topic selection from topic question event:', error);
                }
            });

        // Also listen to storage events for cross-tab communication
        window.addEventListener('storage', () => {
            try {
                quizData.loadData();
                this.updateDisplay();
            } catch (error) {
                console.error('Error updating display from storage event:', error);
            }
        });
    }

    updateDisplay() {
        try {
            this.applyColorSettings();

            // Update display mode if changed
            if (this.currentDisplayMode !== quizData.data.displayMode) {
                this.hideAllSections();
                // Special handling for rapid fire - don't use showSection
                if (quizData.data.displayMode !== 'rapidfire') {
                    // If banner mode and not fullscreen, show normal banner section
                    if (quizData.data.displayMode === 'banner') {
                        if (!quizData.data.bannerFullscreen) {
                            this.showSection('banner');
                        }
                    } else if (quizData.data.displayMode === 'all-topics') {
                        this.showSection('all-topics');
                    } else {
                        this.showSection(quizData.data.displayMode);
                    }
                }
                // Ensure fullscreen banner overlay is hidden unless explicitly requested
                const fullscreenBanner = document.getElementById('banner-fullscreen');
                if (fullscreenBanner && (!quizData.data.bannerFullscreen || quizData.data.displayMode !== 'banner')) {
                    fullscreenBanner.style.display = 'none';
                }
                this.currentDisplayMode = quizData.data.displayMode;
            }

            // Update content based on current mode
            switch (quizData.data.displayMode) {
                case 'banner':
                    this.updateBannerDisplay();
                    break;
                case 'question':
                    this.updateQuestionDisplay();
                    break;
                case 'rapidfire':
                    this.updateRapidFireDisplay();
                    break;
                case 'scoreboard':
                    this.updateScoreboardDisplay();
                    break;
                case 'round':
                    this.updateRoundDisplay();
                    break;
                case 'celebration':
                    this.showCelebration();
                    break;
                case 'answer':
                    this.showAnswer();
                    break;
                case 'timer':
                    this.startTimerDisplay();
                    break;
                case 'all-topics':
                    this.updateAllTopicsDisplay();
                    break;
                default:
                    console.warn('Unknown display mode:', quizData.data.displayMode);
            }
        } catch (error) {
            console.error('Error updating display:', error);
        }
    }
    updateAllTopicsDisplay() {
        try {
            // Show all topics section
            this.showSection('all-topics');
            // Render round rules for topic selection round
            const rulesEl = document.getElementById('all-topics-rules');
            if (rulesEl) {
                rulesEl.innerHTML = this.getRoundRules('topic');
            }
            // Render all topics as tiles
            const topics = Array.isArray(quizData.data.topics) ? quizData.data.topics : [];
            const listEl = document.getElementById('all-topics-list');
            if (listEl) {
                listEl.innerHTML = '';
                if (topics.length === 0) {
                    listEl.innerHTML = '<div style="color:#ccc;font-size:1.3rem;">No topics available</div>';
                } else {
                    topics.forEach(topic => {
                        const tile = document.createElement('div');
                        tile.className = 'topic-tile';
                        tile.textContent = topic;
                        tile.style.cursor = 'default';
                        tile.style.opacity = '1';
                        listEl.appendChild(tile);
                    });
                }
            }
        } catch (err) {
            console.error('Error updating all topics display:', err);
        }
    }

    applyColorSettings() {
        document.documentElement.style.setProperty('--primary', quizData.data.settings.primaryColor);
        document.documentElement.style.setProperty('--accent', quizData.data.settings.accentColor);
    }

    hideAllSections() {
        document.querySelectorAll('.display-section').forEach(section => {
            section.classList.remove('active');
        });
    }

    showSection(sectionName) {
        this.hideAllSections();
        const section = document.getElementById(`${sectionName}-display`);
        if (section) {
            section.classList.add('active');
        }
    }

    updateBannerDisplay() {
        try {
            // If admin requested a full-screen banner, show overlay; otherwise show normal banner section
            if (quizData.data.bannerFullscreen) {
                // Hide the normal sections
                document.querySelectorAll('.display-section').forEach(section => {
                    section.classList.remove('active');
                });

                // Create or show a full screen banner overlay
                let fullscreenBanner = document.getElementById('banner-fullscreen');
                if (!fullscreenBanner) {
                    fullscreenBanner = document.createElement('div');
                    fullscreenBanner.id = 'banner-fullscreen';
                    fullscreenBanner.style.cssText = 'width:100%;height:100%;display:flex;justify-content:center;align-items:center;background:#222;position:fixed;top:0;left:0;z-index:9999;overflow:hidden;';
                    const img = document.createElement('img');
                    img.id = 'banner-fullscreen-img';
                    img.alt = 'Event Banner';
                    img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 4px 32px rgba(0,0,0,0.4);';
                    fullscreenBanner.appendChild(img);
                    document.body.appendChild(fullscreenBanner);
                }
                const img = fullscreenBanner.querySelector('img');
                if (img) img.src = quizData.data.settings.bannerImage;
                fullscreenBanner.style.display = 'flex';
            } else {
                // Show the normal banner section and hide overlay
                const fullscreenBanner = document.getElementById('banner-fullscreen');
                if (fullscreenBanner) {
                    fullscreenBanner.style.display = 'none';
                }

                const titleEl = document.getElementById('display-event-title');
                const subtitleEl = document.getElementById('display-event-subtitle');
                const bannerEl = document.getElementById('display-banner');
                if (titleEl) titleEl.textContent = quizData.data.settings.eventTitle;
                if (subtitleEl) subtitleEl.textContent = quizData.data.settings.eventSubtitle;
                if (bannerEl) bannerEl.src = quizData.data.settings.bannerImage;
                this.showSection('banner');
            }
        } catch (error) {
            console.error('Error updating banner display:', error);
        }
    }

    updateQuestionDisplay() {
        try {
            if (quizData.data.currentQuestion) {
                console.log('[Display] Updating question display:', quizData.data.currentQuestion);

                // Jeopardy questions are displayed using the generic question view

                const questionTextEl = document.getElementById('display-question-text');
                const questionPointsEl = document.getElementById('display-question-points');
                const mediaContainer = document.getElementById('display-question-media');
                const answerContainer = document.getElementById('answer-container');
                if (questionTextEl) {
                    questionTextEl.textContent = quizData.data.currentQuestion.text;
                }
                if (questionPointsEl) {
                    questionPointsEl.textContent = `Points: ${quizData.data.currentQuestion.points}`;
                }
                if (mediaContainer) {
                    mediaContainer.innerHTML = '';
                    if (quizData.data.currentQuestion.type !== 'text' && quizData.data.currentQuestion.media) {
                        try {
                            this.displayQuestionMedia(
                                quizData.data.currentQuestion.type,
                                quizData.data.currentQuestion.media,
                                mediaContainer,
                                quizData.data.currentQuestion.round
                            );
                        } catch (error) {
                            console.error('Error loading media:', error);
                        }
                    }
                }
                // Hide answer
                if (answerContainer) {
                    answerContainer.classList.add('d-none');
                }
            } else {
                const questionTextEl = document.getElementById('display-question-text');
                if (questionTextEl) {
                    questionTextEl.textContent = 'No question selected.';
                }
                console.warn('[Display] No current question to display.');
            }
        } catch (error) {
            console.error('Error updating question display:', error);
        }
    }

    // Render media for a question into the provided container
    displayQuestionMedia(type, mediaData, container, round) {
        try {
            if (!container) return;
            container.innerHTML = '';

            // Attempt to determine mime type from stored property if available
            const current = quizData.data.currentQuestion || {};
            const mime = current.mediaType || (typeof mediaData === 'string' && mediaData.startsWith('data:') ? mediaData.substring(5, mediaData.indexOf(';')) : null);

            if (mime && mime.startsWith('image')) {
                const img = document.createElement('img');
                img.src = mediaData;
                img.alt = 'Question Image';
                img.style.maxWidth = '100%';
                img.style.maxHeight = '360px';
                img.style.objectFit = 'contain';
                container.appendChild(img);
                return;
            }

            if (mime && mime.startsWith('audio')) {
                const audio = document.createElement('audio');
                audio.controls = true;
                audio.src = mediaData;
                audio.style.maxWidth = '100%';
                container.appendChild(audio);
                return;
            }

            if (mime && mime.startsWith('video')) {
                const video = document.createElement('video');
                video.controls = true;
                video.src = mediaData;
                video.style.maxWidth = '100%';
                video.style.maxHeight = '480px';
                video.style.objectFit = 'contain';
                container.appendChild(video);
                return;
            }

            // Fallback: attempt to insert as image if it's a data URL
            if (typeof mediaData === 'string' && mediaData.startsWith('data:image')) {
                const img = document.createElement('img');
                img.src = mediaData;
                img.alt = 'Question Image';
                img.style.maxWidth = '100%';
                img.style.maxHeight = '360px';
                img.style.objectFit = 'contain';
                container.appendChild(img);
                return;
            }

            // Unknown media: show a download link
            const a = document.createElement('a');
            a.href = mediaData;
            a.textContent = 'Open media';
            a.target = '_blank';
            container.appendChild(a);
        } catch (err) {
            console.error('Error in displayQuestionMedia:', err);
        }
    }

    updateRapidFireDisplay() {
        try {
            const container = document.getElementById('rapidfire-display');
            if (!container) return;

            this.showSection('rapidfire');

            const timeEl = document.getElementById('rf-time-remaining');
            const progressFill = document.getElementById('rf-progress-fill');
            const counter = document.getElementById('rf-question-counter');
            const qtext = document.getElementById('rf-question-text');
            const qmedia = document.getElementById('rf-question-media');

            const questions = Array.isArray(quizData.data.rapidFireQuestions) ? quizData.data.rapidFireQuestions : [];
            const idx = Math.max(0, parseInt(quizData.data.rapidFireCurrentIndex) || 0);
            const duration = parseInt(quizData.data.rapidFireDuration) || 90;
            const startTime = parseInt(quizData.data.rapidFireStartTime) || Date.now();

            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.max(0, duration - elapsed);

            if (timeEl) timeEl.textContent = `${remaining}s`;

            const pct = Math.min(100, Math.max(0, (elapsed / Math.max(1, duration)) * 100));
            if (progressFill) progressFill.style.width = `${pct}%`;

            if (counter) counter.textContent = `Question ${Math.min(questions.length, idx + 1)} / ${questions.length || 0}`;

            const currentQ = questions[idx] || null;
            if (currentQ) {
                if (qtext) qtext.textContent = currentQ.text || '';
                if (qmedia) {
                    qmedia.innerHTML = '';
                    if (currentQ.type && currentQ.type !== 'text' && currentQ.media) {
                        this.displayQuestionMedia(currentQ.type, currentQ.media, qmedia, currentQ.round);
                    }
                }
            } else {
                if (qtext) qtext.textContent = 'No question';
                if (qmedia) qmedia.innerHTML = '';
            }

            // Create a repeating update while rapidfire display is active (only one interval)
            if (!this.rapidFireDisplayInterval) {
                this.rapidFireDisplayInterval = setInterval(() => {
                    if (quizData.data.displayMode !== 'rapidfire') {
                        clearInterval(this.rapidFireDisplayInterval);
                        this.rapidFireDisplayInterval = null;
                        return;
                    }
                    // Refresh the UI
                    this.updateRapidFireDisplay();
                }, 500);
            }
        } catch (err) {
            console.error('Error updating rapid fire display:', err);
        }
    }

    updateScoreboardDisplay() {
        try {
            const container = document.getElementById('scoreboard-display');
            if (!container) return;

            container.innerHTML = '';

            const sortedTeams = quizData.getSortedTeams();
            console.log('[Display] Scoreboard update:', sortedTeams);
            if (sortedTeams.length === 0) {
                const msg = document.createElement('div');
                msg.style.textAlign = 'center';
                msg.style.color = '#888';
                msg.style.fontSize = '1.2rem';
                msg.textContent = 'No teams to display.';
                container.appendChild(msg);
            } else {
                sortedTeams.forEach((team, index) => {
                    const teamCard = document.createElement('div');
                    teamCard.className = 'team-card';
                    teamCard.style.borderLeft = `5px solid ${team.color || '#00b0ff'}`;
                    teamCard.innerHTML = `
                        <div class="team-name">${team.name}</div>
                        <div class="team-score">${team.score}</div>
                        <div class="team-members">${team.members}</div>
                        ${team.eliminated ? '<div style="color: red; font-weight: bold;">ELIMINATED</div>' : ''}
                    `;
                    container.appendChild(teamCard);
                });
            }
        } catch (error) {
            console.error('Error updating scoreboard display:', error);
        }
    }

    updateRoundDisplay() {
        try {
            if (quizData.data.currentRound) {
                const roundTitleEl = document.getElementById('display-round-title');
                const roundDescEl = document.getElementById('display-round-description');
                const roundRulesEl = document.getElementById('display-round-rules');
                const topicSelectionEl = document.getElementById('topic-selection');
                const topicInstructionsEl = document.getElementById('topic-selection-instructions');

                if (roundTitleEl) roundTitleEl.textContent = this.formatRoundName(quizData.data.currentRound);
                if (roundDescEl) roundDescEl.textContent = this.getRoundDescription(quizData.data.currentRound);
                if (roundRulesEl) roundRulesEl.innerHTML = this.getRoundRules(quizData.data.currentRound);

                // Show topic selection UI only in topic round
                if (quizData.data.currentRound === 'topic') {
                    if (topicSelectionEl) topicSelectionEl.classList.remove('d-none');
                    if (topicInstructionsEl) topicInstructionsEl.textContent = 'Please select a topic';
                    this.renderTopicSelection();
                } else {
                    if (topicSelectionEl) topicSelectionEl.classList.add('d-none');
                }
                // Jeopardy will display round title and rules like other rounds (no board)
            }
        } catch (error) {
            console.error('Error updating round display:', error);
        }
    }

    renderTopicSelection() {
        try {
            // Ensure round section is visible
            this.showSection('round');

            const container = document.getElementById('topic-selection');
            const tilesEl = document.getElementById('topic-tiles');
            const queueEl = document.getElementById('topic-queue-display');

            if (!container || !tilesEl || !queueEl) return;

            // Show container
            container.classList.remove('d-none');

            // Gather all available topics from both topicPool and topics list, plus any topics in questions
            const pool = Array.isArray(quizData.data.topicPool) ? quizData.data.topicPool : [];
            const adminTopics = Array.isArray(quizData.data.topics) ? quizData.data.topics : [];
            const questionTopics = (quizData.data.questions.topic || []).map(q => q.topic).filter(Boolean);
            // Only include 'Technology' if present in adminTopics or questionTopics
            const allTopicsSet = new Set([...pool, ...adminTopics, ...questionTopics]);
            let allTopics = Array.from(allTopicsSet).filter(t => t && t.trim());
            if (!adminTopics.includes('Technology') && !questionTopics.includes('Technology')) {
                allTopics = allTopics.filter(t => t.toLowerCase() !== 'technology');
            }

            const queue = Array.isArray(quizData.data.topicQueue) ? quizData.data.topicQueue : [];

            // Render tiles
            tilesEl.innerHTML = '';
            if (allTopics.length === 0) {
                tilesEl.innerHTML = '<div style="color:#ccc">No topics available</div>';
            } else {
                const turnByTurn = !!quizData.data.topicTurnByTurn;
                const front = queue.length > 0 ? queue[0] : null;

                allTopics.forEach(topic => {
                    const tile = document.createElement('button');
                    tile.className = 'topic-tile';
                    tile.style.cssText = 'padding:12px 18px;background:var(--primary);color:#fff;border-radius:8px;border:none;cursor:pointer;font-weight:600;box-shadow:0 6px 18px rgba(0,0,0,0.25)';
                    tile.textContent = topic;

                    // Disable or style if no available question for this topic
                    const hasQuestion = (quizData.data.questions.topic || []).some(q => String(q.topic || '').toLowerCase() === String(topic).toLowerCase() && !q.used);
                    if (!hasQuestion) {
                        tile.style.opacity = '0.45';
                        tile.disabled = true;
                        tile.title = 'No unused questions available for this topic';
                    }

                    // If turn-by-turn is enabled and there's a queue, only allow clicking the front topic
                    if (turnByTurn && front && String(front).toLowerCase() !== String(topic).toLowerCase()) {
                        tile.style.opacity = '0.55';
                        tile.disabled = true;
                        tile.title = 'Only the front topic in the queue can be selected (turn-by-turn mode)';
                    } else {
                        // Assign click handler only when tile is enabled
                        tile.addEventListener('click', () => this.handleTopicTileClick(topic));
                    }

                    tilesEl.appendChild(tile);
                });
            }

            // Render queue (simple badges)
            queueEl.innerHTML = '';
            if (!queue || queue.length === 0) {
                queueEl.innerHTML = '<div style="color:#ccc">No queued topics</div>';
            } else {
                queue.forEach((t, i) => {
                    const qItem = document.createElement('div');
                    qItem.style.cssText = 'padding:6px 10px;background:rgba(255,255,255,0.06);color:#fff;border-radius:6px;font-size:0.9rem;';
                    qItem.textContent = `${i+1}. ${t}`;
                    queueEl.appendChild(qItem);
                });
            }
        } catch (error) {
            console.error('Error rendering topic selection:', error);
        }
    }

    async handleTopicTileClick(topic) {
        try {
            // Find an unused question for this topic
            const candidates = (quizData.data.questions.topic || []).filter(q => String(q.topic || '').toLowerCase() === String(topic).toLowerCase());
            let chosen = candidates.find(q => !q.used) || candidates[0] || null;

            if (!chosen) {
                // show temporary message on the topic selection area
                const instr = document.getElementById('topic-selection-instructions');
                if (instr) {
                    const prev = instr.textContent;
                    instr.textContent = 'No questions available for that topic';
                    setTimeout(() => { instr.textContent = prev; }, 2500);
                }
                return;
            }

            // Set selectedTopic for bookkeeping
            quizData.data.selectedTopic = topic;
            // If turn-by-turn is enabled and this topic is the front of the queue, dequeue it
            try {
                const turnByTurn = !!quizData.data.topicTurnByTurn;
                const queue = Array.isArray(quizData.data.topicQueue) ? quizData.data.topicQueue : [];
                if (turnByTurn && queue.length > 0 && String(queue[0]).toLowerCase() === String(topic).toLowerCase()) {
                    // remove front
                    quizData.data.topicQueue.shift();
                    quizData.saveData();
                }
            } catch (err) {
                console.warn('Error adjusting topic queue after selection', err);
            }

            // Set current question to the chosen question and switch to question view
            quizData.setCurrentQuestion('topic', chosen.id);
            quizData.setDisplayMode('question');

            // Notify other tabs/frames (setCurrentQuestion already saves data)
            // Provide a visual feedback on the tile briefly
            const tiles = Array.from(document.querySelectorAll('.topic-tile'));
            const tile = tiles.find(el => el.textContent === topic);
            if (tile) {
                const prevBg = tile.style.background;
                tile.style.background = 'linear-gradient(90deg,#2ecc71,#27ae60)';
                setTimeout(() => { tile.style.background = prevBg; }, 1000);
            }
        } catch (error) {
            console.error('Error handling topic tile click:', error);
        }
    }
    // Jeopardy board and modal helpers removed — Jeopardy uses generic round display

    showCelebration() {
        this.hideAllSections();
        const animation = document.getElementById('correct-answer-animation');
        animation.classList.add('active');
        
        // Create confetti
        this.createConfetti();
        
        this.celebrationActive = true;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            animation.classList.remove('active');
            this.celebrationActive = false;
            quizData.setDisplayMode('scoreboard');
        }, 3000);
    }

    showAnswer() {
        try {
            if (quizData.data.currentQuestion) {
                const answerTextEl = document.getElementById('display-answer-text');
                const answerContainer = document.getElementById('answer-container');
                
                if (answerTextEl) answerTextEl.textContent = quizData.data.currentQuestion.answer;
                if (answerContainer) answerContainer.classList.remove('d-none');
            }
        } catch (error) {
            console.error('Error showing answer:', error);
        }
    }

    startTimerDisplay() {
        try {
            this.showSection('timer');
            
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            
            const timer = quizData.data.timer;
            const progressCircle = document.querySelector('.timer-progress');
            const timerText = document.getElementById('timer-text');
            
            if (!progressCircle || !timerText) {
                console.warn('Timer elements not found');
                return;
            }
            
            const circumference = 2 * Math.PI * 45;
            progressCircle.style.strokeDasharray = circumference;
            
            const updateTimer = () => {
                if (!timer.active) return;
                
                const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
                const remaining = Math.max(0, timer.duration - elapsed);
                
                // Update visual
                const progress = (remaining / timer.duration) * circumference;
                progressCircle.style.strokeDashoffset = circumference - progress;
                timerText.textContent = remaining;
                
                // Color change for urgency
                if (remaining <= 10) {
                    progressCircle.style.stroke = '#ff4444';
                } else if (remaining <= 30) {
                    progressCircle.style.stroke = '#ffaa00';
                } else {
                    progressCircle.style.stroke = 'var(--accent)';
                }
                
                if (remaining <= 0) {
                    clearInterval(this.timerInterval);
                    quizData.stopTimer();
                    console.log('Timer finished');
                }
            };
            
            updateTimer();
            this.timerInterval = setInterval(updateTimer, 1000);
        } catch (error) {
            console.error('Error starting timer display:', error);
        }
    }

    createConfetti() {
        try {
            const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa07a', '#98d8c8', '#f7dc6f'];
            
            for (let i = 0; i < 100; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + 'vw';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animation = `confetti ${Math.random() * 3 + 2}s linear forwards`;
                confetti.style.animationDelay = Math.random() * 2 + 's';
                document.body.appendChild(confetti);
                
                setTimeout(() => {
                    if (confetti.parentNode) {
                        confetti.remove();
                    }
                }, 5000);
            }
        } catch (error) {
            console.error('Error creating confetti:', error);
        }
    }

    // Utility Methods
    formatRoundName(round) {
        const roundNames = {
            general1: 'Semi-Final General Round',
            buzzer1: 'Semi-Final Buzzer Round',
            general2: 'Final General Round',
            topic: 'Topic Selection Round',
            extra: 'Extra Questions Round',
            rapid: 'Rapid Fire Round',
            jeopardy: 'Jeopardy Round'
        };
        
        return roundNames[round] || round;
    }

    getRoundDescription(round) {
        const descriptions = {
            general1: 'Each team will be given 5 questions from mixed general subjects',
            buzzer1: 'Fast-paced buzzer round with 20 questions from various subjects',
            general2: 'Final round with 5 questions per team from general subjects',
            topic: 'Teams select from 5 specialized topics',
            extra: 'Additional questions for tie-breakers or extras',
            rapid: '90 seconds for 10 rapid-fire questions',
            jeopardy: 'Strategic question selection with varying point values'
        };
        
        return descriptions[round] || 'Quiz competition round';
    }

    getRoundRules(round) {
        // Prefer editable rules from stored data; fallback to a default message
        try {
            if (quizData.data.roundRules && quizData.data.roundRules[round]) {
                return quizData.data.roundRules[round];
            }
        } catch (error) {
            console.error('Error reading stored round rules:', error);
        }

        return '<p>Follow quiz master instructions</p>';
    }
}

// Initialize display screen
const displayScreen = new DisplayScreen();

// Handle page visibility for better performance
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        displayScreen.updateDisplay();
    }
});