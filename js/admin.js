import quizData from './data.js';

// Admin Panel Controller
class AdminPanel {
    constructor() {
        this.currentQuestionRound = 'general1';
        this.currentControlRound = 'general1';
        this.sessionLog = [];
        this.updateUITimeout = null;
        this.init();
        }

        // Topic selection helpers
        collectTopics() {
            try {
                // Collect unique topics from questions saved in the 'topic' round
                const questions = quizData.data.questions.topic || [];
                const set = new Set();
                questions.forEach(q => {
                    if (q.topic && q.topic.trim()) set.add(q.topic.trim());
                });
                const topics = Array.from(set);
                quizData.data.topicPool = topics;
                quizData.saveData();
                this.updateTopicControls();
                this.showToast(`Collected ${topics.length} topics`, 'success');
                this.log('Collected topics', { topics });
            } catch (err) {
                console.error('Error collecting topics:', err);
                this.showToast('Error collecting topics', 'error');
            }
        }

        updateTopicControls() {
            try {
                    const pool = Array.isArray(quizData.data.topicPool) ? quizData.data.topicPool : [];
                    const masterTopics = Array.isArray(quizData.data.topics) ? quizData.data.topics : [];
                    const sel = document.getElementById('topic-select');
                    const queueEl = document.getElementById('topic-queue');

                    // Helper to compute counts for a topic
                    const computeCounts = (topic) => {
                        const questions = (quizData.data.questions.topic || []).filter(q => String(q.topic || '').toLowerCase() === String(topic).toLowerCase());
                        const total = questions.length;
                        const unused = questions.filter(q => !q.used).length;
                        return { total, unused };
                    };

                    // Populate the topic-select (pool) with published pool first, then fallback
                    if (sel) {
                        sel.innerHTML = '';
                        const list = pool.length > 0 ? pool.slice() : masterTopics.slice();
                        if (list.length === 0) {
                            const opt = document.createElement('option'); opt.value=''; opt.textContent='(no topics)'; sel.appendChild(opt);
                        } else {
                            list.forEach(t => {
                                const opt = document.createElement('option');
                                opt.value = t;
                                const counts = computeCounts(t);
                                opt.textContent = `${t}${counts.total ? ` (${counts.unused}/${counts.total})` : ''}`;
                                if (counts.total === 0) opt.disabled = true;
                                sel.appendChild(opt);
                            });
                        }
                    }

                    // (Round-topic tiles and single-select removed) The admin Questions tab manages topics.

                    // Show queue
                    const queue = Array.isArray(quizData.data.topicQueue) ? quizData.data.topicQueue : [];
                    if (queueEl) {
                        queueEl.innerHTML = queue.length === 0 ? '<em>No topics queued</em>' : queue.map((t,i)=>`<div style="padding:6px;border-bottom:1px solid #eee;">${i+1}. ${t}</div>`).join('');
                    }
    
                        // ...existing code...
                    // Topic round controls (new section)
                    var showTopicQuestionBtn = document.getElementById('show-topic-question');
                    if (showTopicQuestionBtn) {
                        showTopicQuestionBtn.addEventListener('click', this.showTopicQuestion.bind(this));
                    }

                    var enqueueTopicBtn = document.getElementById('enqueue-topic');
                    if (enqueueTopicBtn) {
                        enqueueTopicBtn.addEventListener('click', this.enqueueTopic.bind(this));
                    }

                    var dequeueNextTopicBtn = document.getElementById('dequeue-next-topic');
                    if (dequeueNextTopicBtn) {
                        dequeueNextTopicBtn.addEventListener('click', this.dequeueNextTopic.bind(this));
                    }

                    var collectTopicsBtn = document.getElementById('collect-topics');
                    if (collectTopicsBtn) {
                        collectTopicsBtn.addEventListener('click', this.collectTopics.bind(this));
                    }

                    var publishTopicsBtn = document.getElementById('publish-topics');
                    if (publishTopicsBtn) {
                        publishTopicsBtn.addEventListener('click', this.publishTopics.bind(this));
                    }

                    var clearTopicQueueBtn = document.getElementById('clear-topic-queue');
                    if (clearTopicQueueBtn) {
                        clearTopicQueueBtn.addEventListener('click', this.clearTopicQueue.bind(this));
                    }
            } catch (err) {
                console.error('Error updating topic controls:', err);
            }
        }

        publishTopics() {
            try {
                // Ensure topicPool exists
                if (!quizData.data.topicPool || quizData.data.topicPool.length === 0) {
                    this.showToast('No topics to publish — collect topics first', 'warning');
                    return;
                }
                // Publish by setting topicPool and switching display to topic round
                quizData.setCurrentRound('topic');
                quizData.data.topicPool = quizData.data.topicPool;
                quizData.setDisplayMode('round');
                quizData.saveData();
                this.showToast('Topics published to display', 'success');
                this.log('Published topic pool to display', { topics: quizData.data.topicPool });
            } catch (err) {
                console.error('Error publishing topics:', err);
                this.showToast('Error publishing topics', 'error');
            }
        }

        clearTopicPool() {
            try {
                quizData.data.topicPool = [];
                quizData.saveData();
                this.updateTopicControls();
                this.showToast('Topic pool cleared', 'info');
            } catch (err) {
                console.error(err);
            }
        }

        showTopicQuestion() {
            try {
                const sel = document.getElementById('topic-select');
                if (!sel || !sel.value) return this.showToast('Select a topic first', 'error');
                const topic = sel.value;
                // find first unused question in topic round with this topic
                const questions = quizData.data.questions.topic || [];
                const q = questions.find(x => x.topic === topic && !x.used) || questions.find(x => x.topic === topic);
                if (!q) return this.showToast('No question found for that topic', 'warning');
                quizData.setCurrentQuestion('topic', q.id);
                quizData.setDisplayMode('question');
                quizData.saveData();
                this.showToast(`Showing question for topic: ${topic}`, 'info');
                this.log('Show topic question', { topic, questionId: q.id });
            } catch (err) {
                console.error('Error showing topic question:', err);
            }
        }

        enqueueTopic() {
            try {
                const sel = document.getElementById('topic-select');
                if (!sel || !sel.value) return this.showToast('Select a topic first', 'error');
                if (!quizData.data.topicQueue) quizData.data.topicQueue = [];
                quizData.data.topicQueue.push(sel.value);
                quizData.saveData();
                this.updateTopicControls();
                this.showToast(`Enqueued topic: ${sel.value}`, 'success');
            } catch (err) { console.error(err); }
        }

        dequeueNextTopic() {
            try {
                const queue = quizData.data.topicQueue || [];
                if (queue.length === 0) return this.showToast('No topics queued', 'warning');
                const topic = queue.shift();
                quizData.data.topicQueue = queue;
                quizData.saveData();
                this.updateTopicControls();
                // Show question for this topic
                // find first unused question for topic
                const questions = quizData.data.questions.topic || [];
                const q = questions.find(x => x.topic === topic && !x.used) || questions.find(x => x.topic === topic);
                if (!q) return this.showToast(`No questions available for topic: ${topic}`, 'warning');
                quizData.setCurrentQuestion('topic', q.id);
                quizData.setDisplayMode('question');
                quizData.saveData();
                this.showToast(`Dequeued and showing topic: ${topic}`, 'info');
                this.log('Dequeued topic', { topic, questionId: q.id });
            } catch (err) { console.error(err); }
        }

        clearTopicQueue() {
            try {
                quizData.data.topicQueue = [];
                quizData.saveData();
                this.updateTopicControls();
                this.showToast('Topic queue cleared', 'info');
            } catch (err) { console.error(err); }
        }

        // Topic management UI (master topic list used by question form)
        updateTopicsUI() {
            try {
                const topics = Array.isArray(quizData.data.topics) ? quizData.data.topics : [];
                const listEl = document.getElementById('topic-list');
                const selectEl = document.getElementById('question-topic-select');

                if (listEl) {
                    listEl.innerHTML = '';
                    if (topics.length === 0) {
                        const none = document.createElement('div');
                        none.style.color = '#666';
                        none.textContent = '(No topics defined)';
                        listEl.appendChild(none);
                    } else {
                        topics.forEach((t, idx) => {
                            const row = document.createElement('div');
                            row.style.display = 'flex';
                            row.style.justifyContent = 'space-between';
                            row.style.alignItems = 'center';
                            row.style.padding = '6px 8px';
                            row.style.border = '1px solid rgba(0,0,0,0.05)';
                            row.style.borderRadius = '6px';
                            row.innerHTML = `<div style="flex:1;">${t}</div>`;
                            const actions = document.createElement('div');
                            actions.style.display = 'flex';
                            actions.style.gap = '6px';
                            const editBtn = document.createElement('button');
                            editBtn.className = 'btn btn-sm btn-primary';
                            editBtn.textContent = 'Edit';
                            editBtn.onclick = () => this.editTopic(idx);
                            const delBtn = document.createElement('button');
                            delBtn.className = 'btn btn-sm btn-danger';
                            delBtn.textContent = 'Delete';
                            delBtn.onclick = () => this.deleteTopic(idx);
                            actions.appendChild(editBtn);
                            actions.appendChild(delBtn);
                            row.appendChild(actions);
                            listEl.appendChild(row);
                        });
                    }
                }

                if (selectEl) {
                    selectEl.innerHTML = '<option value="">(Choose existing topic)</option>';
                    topics.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t;
                        opt.textContent = t;
                        selectEl.appendChild(opt);
                    });
                    // Rounds topic selector removed from UI; topic selection is managed in the Questions tab.
                }
            } catch (err) {
                console.error('Error updating topics UI:', err);
            }
        }

        addTopic(e) {
            try {
                e.preventDefault();
                const input = document.getElementById('topic-name-input');
                const cancelBtn = document.getElementById('cancel-topic-edit');
                if (!input || !input.value.trim()) return this.showToast('Please enter a topic name', 'error');
                const name = input.value.trim();
                if (!Array.isArray(quizData.data.topics)) quizData.data.topics = [];

                const form = document.getElementById('topic-form');
                const editIndex = form.getAttribute('data-edit-index');
                if (editIndex !== null && editIndex !== undefined) {
                    // edit existing
                    const idx = parseInt(editIndex);
                    quizData.data.topics[idx] = name;
                    form.removeAttribute('data-edit-index');
                    if (cancelBtn) cancelBtn.style.display = 'none';
                    this.showToast('Topic updated', 'success');
                } else {
                    // add new if unique
                    if (quizData.data.topics.includes(name)) return this.showToast('Topic already exists', 'warning');
                    quizData.data.topics.push(name);
                    this.showToast('Topic added', 'success');
                }

                input.value = '';
                quizData.saveData();
                this.updateTopicsUI();
                this.updateTopicControls();
            } catch (err) {
                console.error('Error adding topic:', err);
                this.showToast('Error adding topic', 'error');
            }
        }

        editTopic(index) {
            try {
                const topics = quizData.data.topics || [];
                if (!topics[index]) return;
                const input = document.getElementById('topic-name-input');
                const form = document.getElementById('topic-form');
                const cancelBtn = document.getElementById('cancel-topic-edit');
                input.value = topics[index];
                form.setAttribute('data-edit-index', String(index));
                if (cancelBtn) cancelBtn.style.display = 'inline-block';
            } catch (err) {
                console.error('Error entering edit topic mode:', err);
            }
        }

        deleteTopic(index) {
            try {
                const topics = quizData.data.topics || [];
                if (!topics[index]) return;
                if (!confirm(`Delete topic "${topics[index]}"? This will not remove topic references from existing questions.`)) return;
                topics.splice(index, 1);
                quizData.data.topics = topics;
                quizData.saveData();
                this.updateTopicsUI();
                this.updateTopicControls();
                this.showToast('Topic deleted', 'info');
            } catch (err) {
                console.error('Error deleting topic:', err);
                this.showToast('Error deleting topic', 'error');
            }
        }

        // Topic-round helper methods removed from rounds control — topic management remains in Questions tab

    // Session logging for troubleshooting
    log(action, details = {}) {
        const logEntry = {
            timestamp: new Date().toLocaleTimeString(),
            action,
            details,
            teams: quizData.data.teams.map(t => ({ name: t.name, score: t.score }))
        };
        this.sessionLog.push(logEntry);
        console.log(`[${logEntry.timestamp}] ${action}`, details);
    }

    // Rapid Fire: Pass (skip to next question without scoring)
    rapidFirePass() {
        try {
            // Simply advance to next rapid-fire question
            this.nextRapidFireQuestion();
        } catch (err) {
            console.error('Error in rapidFirePass:', err);
        }
    }

    // Rapid Fire: Mark correct, award 10 points to selected team, mark question used, then advance
    rapidFireCorrect() {
        try {
            // Prefer a rapid-fire specific selector if present, otherwise fallback to the general points selector
            const rfTeamSelect = document.getElementById('rf-team-select');
            const teamSelect = rfTeamSelect || document.getElementById('points-team');
            if (!teamSelect) {
                this.showToast('Team selector not found', 'error');
                return;
            }
            let teamId = parseInt(teamSelect.value);
            // Fallback to stored selection if the control is empty
            if (!teamId && quizData.data.selectedRapidTeam) {
                teamId = parseInt(quizData.data.selectedRapidTeam);
            }
            if (!teamId) {
                this.showToast('Please select a team to award points', 'error');
                return;
            }

            const pointsToAward = 10;
            // Award points
            quizData.updateTeamScore(teamId, pointsToAward);

            // Mark current rapid question as used if present
            try {
                if (quizData.data.currentQuestion && quizData.data.currentQuestion.round === 'rapid') {
                    quizData.markQuestionUsed('rapid', quizData.data.currentQuestion.id);
                }
            } catch (err) {
                console.warn('Unable to mark rapid question used', err);
            }

            quizData.saveData();
            this.log('Rapid Fire Correct', { teamId, points: pointsToAward, questionId: quizData.data.currentQuestion && quizData.data.currentQuestion.id });
            this.showToast(`+${pointsToAward} awarded to team`, 'success');

            // Advance to next question
            this.nextRapidFireQuestion();
        } catch (err) {
            console.error('Error in rapidFireCorrect:', err);
        }
    }

    init() {
        this.initializeEventListeners();
        this.setupKeyboardShortcuts();
        this.updateUI();
        this.setupDataListener();
        this.log('Admin panel initialized');
    }

    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Open display screen
        document.getElementById('open-display').addEventListener('click', (e) => {
            e.preventDefault();
            window.open('display.html', 'display', 'width=1200,height=800,menubar=no,toolbar=no');
        });

        // Dashboard controls
        const showBannerBtn = document.getElementById('show-banner');
        if (showBannerBtn) {
            showBannerBtn.addEventListener('click', () => {
                // Admin-triggered banner should be full-screen
                quizData.data.bannerFullscreen = true;
                quizData.setDisplayMode('banner');
                quizData.saveData();
                this.log('Display mode changed (fullscreen banner)', { mode: 'banner' });
            });
        }

        const startEventBtn = document.getElementById('start-event');
        if (startEventBtn) {
            startEventBtn.addEventListener('click', () => {
                // Clear any fullscreen banner state and switch to the round view
                // Use the round selected in the Start Event dropdown
                quizData.data.bannerFullscreen = false;
                const roundDropdown = document.getElementById('start-event-round');
                const selectedRound = (roundDropdown && roundDropdown.value) ? roundDropdown.value : 'general1';
                quizData.setCurrentRound(selectedRound);
                quizData.setDisplayMode('round');
                quizData.saveData();
                this.showToast(`Event started with ${this.formatRoundName(selectedRound)}`, 'success');
                this.log('Event started', { round: selectedRound });
            });
        }

        const showScoreboardBtn = document.getElementById('show-scoreboard');
        if (showScoreboardBtn) {
            showScoreboardBtn.addEventListener('click', () => {
                quizData.setDisplayMode('scoreboard');
                this.log('Display mode changed', { mode: 'scoreboard' });
            });
        }

        const resetScoresBtn = document.getElementById('reset-scores');
        if (resetScoresBtn) {
            resetScoresBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all scores?')) {
                    quizData.resetAllScores();
                    this.log('All scores reset');
                }
            });
        }

        const updateDisplayBtn = document.getElementById('update-display');
        if (updateDisplayBtn) {
            updateDisplayBtn.addEventListener('click', () => {
                const modeSelect = document.getElementById('display-mode');
                if (modeSelect) {
                    const mode = modeSelect.value;
                    quizData.setDisplayMode(mode);
                    this.log('Display mode updated', { mode });
                }
            });
        }

        // Teams management
        const addTeamBtn = document.getElementById('add-team');
        if (addTeamBtn) addTeamBtn.addEventListener('click', () => this.showTeamForm());
        
        const cancelTeamBtn = document.getElementById('cancel-team');
        if (cancelTeamBtn) cancelTeamBtn.addEventListener('click', () => this.hideTeamForm());
        
        const teamForm = document.getElementById('team-form');
        if (teamForm) teamForm.addEventListener('submit', (e) => this.saveTeam(e));


        // Questions management
        document.querySelectorAll('.tab[data-question-round]').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab[data-question-round]').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentQuestionRound = tab.getAttribute('data-question-round');
                this.updateQuestionsTable(this.currentQuestionRound);
            });
        });

        const addQuestionBtn = document.getElementById('add-question');
        if (addQuestionBtn) addQuestionBtn.addEventListener('click', () => this.showQuestionForm());

        const resetUsedQuestionsBtn = document.getElementById('reset-used-questions');
        if (resetUsedQuestionsBtn) {
            resetUsedQuestionsBtn.addEventListener('click', () => {
                if (confirm('Reset all used questions for this round?')) {
                    const round = this.currentQuestionRound;
                    quizData.data.questions[round].forEach(q => q.used = false);
                    quizData.saveData();
                    this.updateQuestionsTable(round);
                    this.showToast('All used questions have been reset for this round.', 'success');
                }
            });
        }

        const cancelQuestionBtn = document.getElementById('cancel-question');
        if (cancelQuestionBtn) cancelQuestionBtn.addEventListener('click', () => this.hideQuestionForm());

        const questionForm = document.getElementById('question-form');
        if (questionForm) questionForm.addEventListener('submit', (e) => this.saveQuestion(e));

        // Media type toggle
        const questionTypeSelect = document.getElementById('question-type');
        if (questionTypeSelect) {
            questionTypeSelect.addEventListener('change', (e) => {
                const mediaGroup = document.getElementById('media-upload-group');
                if (mediaGroup) {
                    mediaGroup.classList.toggle('d-none', e.target.value === 'text');
                    if (e.target.value !== 'text') {
                        this.updateMediaInputAccept(e.target.value);
                    }
                }
            });
        }

        // Show/hide Jeopardy options when question round changes
        const questionRoundSelect = document.getElementById('question-round');
        if (questionRoundSelect) {
            const toggleJeopardyOptions = (val) => {
                const jOpt = document.getElementById('jeopardy-options');
                if (!jOpt) return;
                jOpt.classList.toggle('d-none', val !== 'jeopardy');
            };
            // initialize visibility
            toggleJeopardyOptions(questionRoundSelect.value);
            questionRoundSelect.addEventListener('change', (e) => toggleJeopardyOptions(e.target.value));
        }

        // Media file input listener
        const mediaInput = document.getElementById('question-media');
        if (mediaInput) {
            mediaInput.addEventListener('change', (e) => this.handleMediaPreview(e));
        }

        // Rounds control
        document.querySelectorAll('.tab[data-round]').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab[data-round]').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentControlRound = tab.getAttribute('data-round');
                this.updateRoundControls(this.currentControlRound);
            });
        });

        const showQuestionBtn = document.getElementById('show-question');
        if (showQuestionBtn) showQuestionBtn.addEventListener('click', () => this.showQuestionOnDisplay());

        // When the round question select changes, show the correct answer preview in the round controls
        const roundQuestionSelect = document.getElementById('round-question');
        if (roundQuestionSelect) {
            roundQuestionSelect.addEventListener('change', () => {
                try {
                    const sel = parseInt(roundQuestionSelect.value);
                    const answerEl = document.getElementById('round-current-answer');
                    const round = this.currentControlRound;
                    if (!answerEl) return;

                    if (sel && quizData.data.questions[round]) {
                        const q = quizData.data.questions[round].find(x => parseInt(x.id) === sel);
                        answerEl.textContent = q && q.answer ? q.answer : '—';
                    } else {
                        answerEl.textContent = '—';
                    }
                } catch (err) {
                    console.error('Error updating round answer preview:', err);
                }
            });
        }

        // Round-topic controls have been removed from the rounds UI; topic management remains in Questions tab.
        const markCorrectBtn = document.getElementById('mark-correct');
        if (markCorrectBtn) markCorrectBtn.addEventListener('click', () => this.markCorrectAnswer());
        
        const markIncorrectBtn = document.getElementById('mark-incorrect');
        if (markIncorrectBtn) markIncorrectBtn.addEventListener('click', () => this.markIncorrectAnswer());
        
        const nextQuestionBtn = document.getElementById('next-question');
        if (nextQuestionBtn) nextQuestionBtn.addEventListener('click', () => this.nextQuestion());
        const prevQuestionBtn = document.getElementById('prev-question');
        if (prevQuestionBtn) prevQuestionBtn.addEventListener('click', () => this.prevQuestion());
        const stopRoundBtn = document.getElementById('stop-round');
        if (stopRoundBtn) stopRoundBtn.addEventListener('click', () => this.stopRound());
        
        const showAnswerBtn = document.getElementById('show-answer');
        if (showAnswerBtn) showAnswerBtn.addEventListener('click', () => this.showAnswer());
        
        // Rapid Fire buttons
        const startRapidFireBtn = document.getElementById('start-rapid-fire');
        if (startRapidFireBtn) startRapidFireBtn.addEventListener('click', () => this.startRapidFire());
        
        const stopRapidFireBtn = document.getElementById('stop-rapid-fire');
        if (stopRapidFireBtn) stopRapidFireBtn.addEventListener('click', () => this.stopRapidFire());

        const nextRapidFireBtn = document.getElementById('next-rapid-fire');
        if (nextRapidFireBtn) nextRapidFireBtn.addEventListener('click', () => this.nextRapidFireQuestion());
        const prevRapidFireBtn = document.getElementById('prev-rapid-fire');
        if (prevRapidFireBtn) prevRapidFireBtn.addEventListener('click', () => this.prevRapidFireQuestion());
        const rfPassBtn = document.getElementById('rf-pass');
        if (rfPassBtn) rfPassBtn.addEventListener('click', () => this.rapidFirePass());
        const rfCorrectBtn = document.getElementById('rf-correct');
        if (rfCorrectBtn) rfCorrectBtn.addEventListener('click', () => this.rapidFireCorrect());

        // Persist Rapid Fire team selection when changed so it doesn't reset unexpectedly
        const rfTeamSelect = document.getElementById('rf-team-select');
        if (rfTeamSelect) {
            rfTeamSelect.addEventListener('change', () => {
                try {
                    quizData.data.selectedRapidTeam = parseInt(rfTeamSelect.value) || null;
                    quizData.saveData();
                } catch (err) {
                    console.warn('Unable to persist selectedRapidTeam', err);
                }
            });
        }

        // Rapid Fire settings listeners
        const totalTimeInput = document.getElementById('rapid-fire-total-time');
        const questionCountInput = document.getElementById('rapid-fire-question-count');
        
        if (totalTimeInput) {
            totalTimeInput.addEventListener('change', () => this.updateRapidFireCalculations());
            totalTimeInput.addEventListener('input', () => this.updateRapidFireCalculations());
        }
        
        if (questionCountInput) {
            questionCountInput.addEventListener('change', () => this.updateRapidFireCalculations());
            questionCountInput.addEventListener('input', () => this.updateRapidFireCalculations());
        }
        
        const addPointsBtn = document.getElementById('add-points');
        if (addPointsBtn) addPointsBtn.addEventListener('click', () => this.addPointsToTeam());
        
        const subtractPointsBtn = document.getElementById('subtract-points');
        if (subtractPointsBtn) subtractPointsBtn.addEventListener('click', () => this.subtractPointsFromTeam());

        // Settings
        const settingsForm = document.getElementById('settings-form');
        if (settingsForm) settingsForm.addEventListener('submit', (e) => this.saveSettings(e));

        // Local file controls (File System Access API + fallback)
        const openDataFileBtn = document.getElementById('open-data-file');
        const saveDataFileBtn = document.getElementById('save-data-file');
        const exportDataBtn = document.getElementById('export-data');
        const importDataBtn = document.getElementById('import-data');
        const openCodeFileBtn = document.getElementById('open-code-file');

        if (openDataFileBtn) {
            openDataFileBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.openDataFile();
            });
        }

        if (saveDataFileBtn) {
            saveDataFileBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.saveDataFile();
            });
        }

        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const json = quizData.getJSONString();
                if (!json) return this.showToast('Failed to gather data for export', 'danger');
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'quiz-data.json';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                this.showToast('Data exported (download).', 'success');
            });
        }

        if (importDataBtn) {
            importDataBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json,application/json';
                input.onchange = async () => {
                    const file = input.files[0];
                    if (!file) return;
                    try {
                        const text = await file.text();
                        const ok = quizData.importJSONString(text);
                        if (ok) {
                            this.showToast('Data imported successfully', 'success');
                            this.updateUI();
                        } else {
                            this.showToast('Failed to import data', 'danger');
                        }
                    } catch (err) {
                        console.error(err);
                        this.showToast('Error reading file', 'danger');
                    }
                };
                input.click();
            });
        }

        if (openCodeFileBtn) {
            openCodeFileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openCodeFileEditor();
            });
        }

        // Auto-save toggle: update settings immediately when changed
        const autoSaveToggle = document.getElementById('auto-save-toggle');
        if (autoSaveToggle) {
            // initialize from saved setting
            try {
                autoSaveToggle.checked = !!(quizData.data.settings && quizData.data.settings.autoSaveEnabled);
            } catch (err) {
                autoSaveToggle.checked = false;
            }

            autoSaveToggle.addEventListener('change', () => {
                if (!quizData.data.settings) quizData.data.settings = {};
                quizData.data.settings.autoSaveEnabled = !!autoSaveToggle.checked;
                quizData.saveData();
                this.showToast(`Auto-save ${autoSaveToggle.checked ? 'enabled' : 'disabled'}`, 'info');
            });
        }

        // Round rules editor
        const roundRulesSelect = document.getElementById('round-rules-select');
        const roundRulesText = document.getElementById('round-rules-text');
        const saveRoundRulesBtn = document.getElementById('save-round-rules');

        if (roundRulesSelect && roundRulesText) {
            // Initialize with stored rules if available
            const initRound = roundRulesSelect.value;
            roundRulesText.value = quizData.data.roundRules && quizData.data.roundRules[initRound] ? quizData.data.roundRules[initRound] : '';

            roundRulesSelect.addEventListener('change', () => {
                const r = roundRulesSelect.value;
                roundRulesText.value = quizData.data.roundRules && quizData.data.roundRules[r] ? quizData.data.roundRules[r] : '';
            });
        }

        if (saveRoundRulesBtn && roundRulesSelect && roundRulesText) {
            saveRoundRulesBtn.addEventListener('click', () => {
                const r = roundRulesSelect.value;
                const html = roundRulesText.value;
                if (!quizData.data.roundRules) quizData.data.roundRules = {};
                quizData.data.roundRules[r] = html;
                quizData.saveData();
                this.showToast('Rules saved for ' + r, 'success');
                this.log('Round rules updated', { round: r });
            });
        }

        // Preview handler
        const previewRoundRulesBtn = document.getElementById('preview-round-rules');
        const previewModal = document.getElementById('round-rules-preview-modal');
        const previewContent = document.getElementById('round-rules-preview-content');
        const closePreviewBtn = document.getElementById('close-round-rules-preview');

        if (previewRoundRulesBtn && roundRulesText && previewModal && previewContent) {
            previewRoundRulesBtn.addEventListener('click', () => {
                const html = roundRulesText.value || '<p>(No rules entered)</p>';
                // Render the HTML into the preview container
                previewContent.innerHTML = html;
                previewModal.style.display = 'flex';
            });
        }

        if (closePreviewBtn && previewModal) {
            closePreviewBtn.addEventListener('click', () => {
                previewModal.style.display = 'none';
                previewContent.innerHTML = '';
            });
        }

        // Scoreboard
        const refreshScoresBtn = document.getElementById('refresh-scores');
        if (refreshScoresBtn) refreshScoresBtn.addEventListener('click', () => this.updateScoreboard());

        // Jeopardy board update handler
        const updateJeopardyBoardBtn = document.getElementById('update-jeopardy-board');
        if (updateJeopardyBoardBtn) {
            updateJeopardyBoardBtn.addEventListener('click', () => {
                const img = document.getElementById('jeopardy-board-image')?.value || '';
                const rows = parseInt(document.getElementById('jeopardy-board-rows')?.value) || 5;
                const cols = parseInt(document.getElementById('jeopardy-board-cols')?.value) || 5;

                // Read categories
                const categories = [];
                for (let i = 1; i <= cols; i++) {
                    const el = document.getElementById(`jeopardy-cat-${i}`);
                    categories.push(el ? (el.value || `Category ${i}`) : `Category ${i}`);
                }

                // Read point values (top to bottom)
                const pointValues = [];
                for (let i = 1; i <= rows; i++) {
                    const el = document.getElementById(`jeopardy-point-${i}`) || document.getElementById(`jeopardy-point-${i}`);
                    pointValues.push(el ? (parseInt(el.value) || (i * 100)) : (i * 100));
                }

                if (!quizData.data.jeopardyBoard) quizData.data.jeopardyBoard = {};
                quizData.data.jeopardyBoard.image = img;
                quizData.data.jeopardyBoard.rows = rows;
                quizData.data.jeopardyBoard.cols = cols;
                quizData.data.jeopardyBoard.categories = categories;
                quizData.data.jeopardyBoard.pointValues = pointValues;
                quizData.saveData();
                // Refresh any admin selectors that depend on the board configuration
                this.populateJeopardySelectors();
                this.showToast('Jeopardy board updated', 'success');
                this.log('Jeopardy board updated', { image: img, rows, cols, categories, pointValues });
            });
        }

        // Preview Jeopardy board (open display and set round)
        const previewJeopardyBtn = document.getElementById('preview-jeopardy-board');
        if (previewJeopardyBtn) {
            previewJeopardyBtn.addEventListener('click', () => {
                // Ensure board settings saved
                const saveBtn = document.getElementById('update-jeopardy-board');
                if (saveBtn) saveBtn.click();

                // Set display to Jeopardy round and open display
                quizData.setCurrentRound('jeopardy');
                quizData.setDisplayMode('round');
                quizData.saveData();
                window.open('display.html', 'display', 'width=1200,height=800,menubar=no,toolbar=no');
                this.showToast('Opening Jeopardy preview', 'info');
                this.log('Jeopardy board preview opened');
            });
        }

        // Open Jeopardy board in a new browser tab (local dev server)
        const openJeopardyBoardBtn = document.getElementById('open-jeopardy-board');
        if (openJeopardyBoardBtn) {
            openJeopardyBoardBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const url = 'http://127.0.0.1:5500/Jeopardy%20Round/index.html';
                try {
                    window.open(url, '_blank');
                    this.log('Opened Jeopardy board in new tab', { url });
                    this.showToast('Jeopardy board opened in a new tab', 'info');
                } catch (err) {
                    console.error('Failed to open Jeopardy board:', err);
                    this.showToast('Unable to open Jeopardy board', 'error');
                }
            });
        }

        // Jeopardy round-select controls (show tile by row/column)
        const showJeopardyTileBtn = document.getElementById('show-jeopardy-tile');
        if (showJeopardyTileBtn) showJeopardyTileBtn.addEventListener('click', () => this.showJeopardyTileOnDisplay());

        const refreshJeopardyBtn = document.getElementById('refresh-jeopardy-selects');
        if (refreshJeopardyBtn) refreshJeopardyBtn.addEventListener('click', () => this.populateJeopardySelectors());

        // Topic selection controls removed from the rounds UI; topic management remains in Questions tab

        // Topic Management (create/edit/delete)
        const topicForm = document.getElementById('topic-form');
        const cancelTopicBtn = document.getElementById('cancel-topic-edit');
        if (topicForm) topicForm.addEventListener('submit', (e) => this.addTopic(e));
        if (cancelTopicBtn) cancelTopicBtn.addEventListener('click', () => {
            const input = document.getElementById('topic-name-input');
            if (input) input.value = '';
            topicForm.removeAttribute('data-edit-index');
            cancelTopicBtn.style.display = 'none';
        });
    }

    setupDataListener() {
        window.addEventListener('quizDataUpdated', () => {
            // Debounce updateUI to prevent excessive calls
            if (this.updateUITimeout) {
                clearTimeout(this.updateUITimeout);
            }
            this.updateUITimeout = setTimeout(() => {
                this.updateUI();
                this.updateUITimeout = null;
            }, 200); // Wait 200ms before updating UI
            // If admin previously opened/selected a file for data saving, persist updates to that file as well
            if (this._dataFileHandle && quizData.data && quizData.data.settings && quizData.data.settings.autoSaveEnabled) {
                try {
                    const json = quizData.getJSONString();
                    if (json) this.writeStringToHandle(this._dataFileHandle, json);
                } catch (err) {
                    console.warn('Auto-save to file failed', err);
                }
            }
        });

            // Listen for topic question updates in real time (new questions added to topic round)
            window.addEventListener('quizTopicQuestionsUpdated', () => {
                // Update admin topic controls and question dropdowns instantly
                this.updateAdminTopicControls();
                this.updateQuestionDropdown('topic');
                this.updateQuestionsTable('topic');
            });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N: Next Question
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.nextQuestion();
                this.log('Keyboard shortcut', { action: 'Next Question (Ctrl+N)' });
            }
            // Ctrl/Cmd + M: Mark Correct
            if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                e.preventDefault();
                this.markCorrectAnswer();
                this.log('Keyboard shortcut', { action: 'Mark Correct (Ctrl+M)' });
            }
            // Ctrl/Cmd + Shift + M: Mark Incorrect
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
                e.preventDefault();
                this.markIncorrectAnswer();
                this.log('Keyboard shortcut', { action: 'Mark Incorrect (Ctrl+Shift+M)' });
            }
            // Ctrl/Cmd + A: Show Answer
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                this.showAnswer();
                this.log('Keyboard shortcut', { action: 'Show Answer (Ctrl+A)' });
            }
        });
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`.nav-links a[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        // Update specific tab content
        switch (tabName) {
            case 'questions':
                this.updateQuestionsTable(this.currentQuestionRound);
                break;
            case 'rounds':
                this.updateRoundControls(this.currentControlRound);
                break;
            case 'scoreboard':
                this.updateScoreboard();
                break;
        }
    }

    updateUI() {
        this.updateDashboard();
        this.updateTeamsTable();
        this.updateQuestionsTable(this.currentQuestionRound);
        this.updateRoundControls(this.currentControlRound);
        // Ensure round-topic tiles/select are populated even if rounds tab isn't active
        try { this.updateTopicControls(); } catch (err) { /* ignore if not yet present */ }
        this.updateScoreboard();
        this.updateSettingsForm();
        // Update topics UI (topic list and question-topic selector)
        try { this.updateTopicsUI(); } catch (err) { /* ignore if elements not present yet */ }
    }

    updateDashboard() {
        document.getElementById('teams-count').textContent = quizData.data.teams.length;
        
        let totalQuestions = 0;
        for (const round in quizData.data.questions) {
            totalQuestions += quizData.data.questions[round].length;
        }
        document.getElementById('questions-count').textContent = totalQuestions;
        
        // Show the round of the currently displayed question, or fallback to currentRound
        const displayRound = quizData.data.currentQuestion ? quizData.data.currentQuestion.round : quizData.data.currentRound;
        document.getElementById('current-round').textContent = displayRound ? 
            this.formatRoundName(displayRound) : 'Not Started';
        
        document.getElementById('event-status').textContent = quizData.data.currentRound ? 
            'In Progress' : 'Ready';

        // Update live question display
        try {
            const q = quizData.data.currentQuestion;
            const noQInfo = document.getElementById('no-question-info');
            const roundEl = document.getElementById('live-question-round');
            const idEl = document.getElementById('live-question-id');
            const textEl = document.getElementById('live-question-text');
            const answerEl = document.getElementById('live-question-answer');
            const pointsEl = document.getElementById('live-question-points');
            const usedEl = document.getElementById('live-question-used');

            if (q && q.text) {
                // Hide "no question" message and show question info
                if (noQInfo) noQInfo.style.display = 'none';
                if (roundEl) roundEl.textContent = this.formatRoundName(q.round);
                if (idEl) idEl.textContent = `#${q.id}`;
                if (textEl) textEl.textContent = q.text;
                if (answerEl) answerEl.textContent = q.answer;
                if (pointsEl) pointsEl.textContent = q.points || '10';
                if (usedEl) usedEl.textContent = q.used ? '✅ Used' : '❌ Not Used';
                if (usedEl) usedEl.style.color = q.used ? '#5cb85c' : '#999';
            } else {
                // Show "no question" message
                if (noQInfo) noQInfo.style.display = 'block';
                if (roundEl) roundEl.textContent = '—';
                if (idEl) idEl.textContent = '—';
                if (textEl) textEl.textContent = '';
                if (answerEl) answerEl.textContent = '';
                if (pointsEl) pointsEl.textContent = '—';
                if (usedEl) usedEl.textContent = 'Not Used';
                if (usedEl) usedEl.style.color = '#999';
            }
        } catch (error) {
            console.error('Error updating live question display:', error);
        }
    }

    // Teams Management
    showTeamForm(teamId = null) {
        const formCard = document.getElementById('team-form-card');
        const formTitle = document.getElementById('team-form-title');
        const form = document.getElementById('team-form');
        
        if (teamId) {
            // Edit mode
            formTitle.textContent = 'Edit Team';
            const team = quizData.data.teams.find(t => t.id === teamId);
            document.getElementById('team-name').value = team.name;
            document.getElementById('team-members').value = team.members;
            document.getElementById('team-score').value = team.score;
            form.setAttribute('data-team-id', teamId);
        } else {
            // Add mode
            formTitle.textContent = 'Add New Team';
            form.reset();
            form.removeAttribute('data-team-id');
        }
        
        formCard.classList.remove('d-none');
    }

    hideTeamForm() {
        document.getElementById('team-form-card').classList.add('d-none');
    }

    saveTeam(e) {
        e.preventDefault();
        
        const form = document.getElementById('team-form');
        const teamId = form.getAttribute('data-team-id');
        const nameInput = document.getElementById('team-name');
        const membersInput = document.getElementById('team-members');
        const scoreInput = document.getElementById('team-score');
        
        // Validation
        if (!nameInput || !nameInput.value.trim()) {
            this.showToast('Please enter team name', 'error');
            return;
        }
        if (!membersInput || !membersInput.value.trim()) {
            this.showToast('Please enter team members', 'error');
            return;
        }
        
        const name = nameInput.value.trim();
        const members = membersInput.value.trim();
        const score = parseInt(scoreInput?.value) || 0;
        
        if (teamId) {
            quizData.updateTeam(parseInt(teamId), { name, members, score });
            this.log('Team updated', { teamId, name, score });
        } else {
            quizData.addTeam({ name, members, score });
            this.log('Team added', { name, score });
        }
        
        this.hideTeamForm();
    }

    deleteTeam(teamId) {
        if (confirm('Are you sure you want to delete this team?')) {
            quizData.deleteTeam(teamId);
        }
    }

    updateTeamsTable() {
        const tbody = document.querySelector('#teams-table tbody');
        tbody.innerHTML = '';
        
        quizData.data.teams.forEach(team => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${team.id}</td>
                <td>${team.name}</td>
                <td>${team.members}</td>
                <td>${team.score}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="adminPanel.showTeamForm(${team.id})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="adminPanel.deleteTeam(${team.id})">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Questions Management
    showQuestionForm(questionId = null, round = null) {
        const formCard = document.getElementById('question-form-card');
        const formTitle = document.getElementById('question-form-title');
        const form = document.getElementById('question-form');
        
        if (questionId && round) {
            // Edit mode
            formTitle.textContent = 'Edit Question';
            const question = quizData.data.questions[round].find(q => q.id === questionId);
            document.getElementById('question-text').value = question.text;
            document.getElementById('question-answer').value = question.answer;
            document.getElementById('question-points').value = question.points;
            document.getElementById('question-round').value = round;
            document.getElementById('question-type').value = question.type || 'text';
            
            const mediaGroup = document.getElementById('media-upload-group');
            mediaGroup.classList.toggle('d-none', !question.type || question.type === 'text');
            
            // Show media preview if exists
            if (question.media && question.type !== 'text') {
                const previewDiv = document.getElementById('media-preview');
                const previewContent = document.getElementById('preview-content');
                if (previewDiv && previewContent) {
                    previewDiv.style.display = 'block';
                    this.displayMediaPreview({
                        type: question.mediaType || this.getMimeType(question.type),
                        name: question.mediaName || `media.${this.getExtension(question.type)}`
                    }, question.media);
                }
            }
            
            form.setAttribute('data-question-id', questionId);
            form.setAttribute('data-question-round', round);
            // Populate Jeopardy-specific fields when editing
            try {
                const jOpt = document.getElementById('jeopardy-options');
                if (jOpt) jOpt.classList.toggle('d-none', round !== 'jeopardy');
                const disp = document.getElementById('jeopardy-display-start');
                const showTeam = document.getElementById('jeopardy-show-team-choices');
                const rowEl = document.getElementById('jeopardy-row');
                const colEl = document.getElementById('jeopardy-column');
                if (disp) disp.checked = !!question.displayAtStart;
                if (showTeam) showTeam.checked = !!question.showTeamChoices;
                // Constrain row/col to the board configuration
                const board = quizData.data.jeopardyBoard || {};
                const maxRows = parseInt(board.rows) || (board.pointValues ? board.pointValues.length : 5);
                const maxCols = parseInt(board.cols) || (board.categories ? board.categories.length : 5);
                if (rowEl) {
                    rowEl.max = maxRows;
                    rowEl.min = 1;
                    rowEl.value = Math.min(Math.max(parseInt(question.row) || 1, 1), maxRows);
                }
                if (colEl) {
                    colEl.max = maxCols;
                    colEl.min = 1;
                    colEl.value = Math.min(Math.max(parseInt(question.column) || 1, 1), maxCols);
                }
            } catch (err) {
                console.warn('Jeopardy fields not present', err);
            }
        } else {
            // Add mode
            formTitle.textContent = 'Add New Question';
            form.reset();
            document.getElementById('question-round').value = this.currentQuestionRound;
            document.getElementById('question-type').value = 'text';
            document.getElementById('media-upload-group').classList.add('d-none');
            this.clearMediaPreview();
            form.removeAttribute('data-question-id');
            form.removeAttribute('data-question-round');
            // Default Jeopardy options when adding
            try {
                const jOpt = document.getElementById('jeopardy-options');
                const disp = document.getElementById('jeopardy-display-start');
                const showTeam = document.getElementById('jeopardy-show-team-choices');
                const rowEl = document.getElementById('jeopardy-row');
                const colEl = document.getElementById('jeopardy-column');
                if (jOpt) jOpt.classList.toggle('d-none', this.currentQuestionRound !== 'jeopardy');
                if (disp) disp.checked = false;
                if (showTeam) showTeam.checked = false;
                const board = quizData.data.jeopardyBoard || {};
                const maxRows = parseInt(board.rows) || (board.pointValues ? board.pointValues.length : 5);
                const maxCols = parseInt(board.cols) || (board.categories ? board.categories.length : 5);
                if (rowEl) { rowEl.min = 1; rowEl.max = maxRows; rowEl.value = 1; }
                if (colEl) { colEl.min = 1; colEl.max = maxCols; colEl.value = 1; }
            } catch (err) {
                // ignore if elements not present
            }
        }
        
        formCard.classList.remove('d-none');
    }

    hideQuestionForm() {
        document.getElementById('question-form-card').classList.add('d-none');
    }

    saveQuestion(e) {
        e.preventDefault();
        
        const form = document.getElementById('question-form');
        const questionId = form.getAttribute('data-question-id');
        const originalRound = form.getAttribute('data-question-round');
        
        const textInput = document.getElementById('question-text');
        const answerInput = document.getElementById('question-answer');
        const pointsInput = document.getElementById('question-points');
        const roundSelect = document.getElementById('question-round');
        const typeSelect = document.getElementById('question-type');
        
        // Validation
        if (!textInput || !textInput.value.trim()) {
            this.showToast('Please enter question text', 'error');
            return;
        }
        if (!answerInput || !answerInput.value.trim()) {
            this.showToast('Please enter answer', 'error');
            return;
        }
        if (!pointsInput || parseInt(pointsInput.value) <= 0) {
            this.showToast('Please enter valid points', 'error');
            return;
        }
        
        const text = textInput.value.trim();
        const answer = answerInput.value.trim();
        const points = parseInt(pointsInput.value) || 10;
        const round = roundSelect?.value || this.currentQuestionRound;
        const type = typeSelect?.value || 'text';
        
        const questionData = {
            text,
            answer,
            points,
            type
        };

        // Topic metadata: always assign selected topic if present, otherwise use custom topic
        try {
            const topicSelect = document.getElementById('question-topic-select');
            const topicCustom = document.getElementById('question-topic-custom');
            let topicVal = '';
            if (topicSelect && topicSelect.value && topicSelect.value !== '') {
                topicVal = topicSelect.value.trim();
            } else if (topicCustom && topicCustom.value && topicCustom.value.trim()) {
                topicVal = topicCustom.value.trim();
            }
            // Always assign topic for topic round
            if (round === 'topic') {
                questionData.topic = topicVal;
            } else if (topicVal) {
                questionData.topic = topicVal;
            }
        } catch (err) {
            // ignore
        }

        // Attach Jeopardy-specific metadata when applicable
        try {
            if (round === 'jeopardy') {
                const disp = document.getElementById('jeopardy-display-start');
                const showTeam = document.getElementById('jeopardy-show-team-choices');
                const rowEl = document.getElementById('jeopardy-row');
                const colEl = document.getElementById('jeopardy-column');
                questionData.displayAtStart = !!(disp && disp.checked);
                questionData.showTeamChoices = !!(showTeam && showTeam.checked);
                questionData.row = parseInt(rowEl?.value) || 1;
                questionData.column = parseInt(colEl?.value) || 1;
            }
        } catch (err) {
            console.warn('Unable to read Jeopardy fields', err);
        }

        // Handle media upload
        const mediaFile = document.getElementById('question-media');
        if (mediaFile && mediaFile.files && mediaFile.files[0]) {
            const file = mediaFile.files[0];
            
            // Show loading message
            const statusEl = document.getElementById('upload-status');
            if (statusEl) {
                statusEl.innerHTML = '<small style="color: #666;">💾 Saving question with media...</small>';
            }
            
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    questionData.media = evt.target.result;
                    questionData.mediaType = file.type;
                    questionData.mediaName = file.name;
                    
                    this.finalizeQuestionSave(questionId, originalRound, round, questionData);
                    
                    if (statusEl) {
                        statusEl.innerHTML = '<small style="color: green;">✅ Question saved successfully!</small>';
                        setTimeout(() => {
                            statusEl.innerHTML = '';
                        }, 2000);
                    }
                } catch (error) {
                    console.error('Error saving question with media:', error);
                    this.showToast('Error saving question', 'error');
                    if (statusEl) {
                        statusEl.innerHTML = '<small style="color: red;">❌ Error saving question</small>';
                    }
                }
            };
            reader.onerror = () => {
                this.showToast('Failed to read media file', 'error');
                if (statusEl) {
                    statusEl.innerHTML = '<small style="color: red;">❌ Error reading file</small>';
                }
            };
            reader.readAsDataURL(file);
        } else {
            this.finalizeQuestionSave(questionId, originalRound, round, questionData);
        }
    }

    finalizeQuestionSave(questionId, originalRound, round, questionData) {
        let isNewTopicQuestion = false;
        if (questionId && originalRound) {
            if (originalRound !== round) {
                quizData.deleteQuestion(originalRound, parseInt(questionId));
                quizData.addQuestion(round, questionData);
                if (round === 'topic') isNewTopicQuestion = true;
            } else {
                quizData.updateQuestion(round, parseInt(questionId), questionData);
            }
        } else {
            quizData.addQuestion(round, questionData);
            if (round === 'topic') isNewTopicQuestion = true;
        }
        this.hideQuestionForm();
        this.updateQuestionsTable(round);
        // Dispatch event to update topic controls in real time if new topic question added
        if (isNewTopicQuestion) {
            window.dispatchEvent(new CustomEvent('quizTopicQuestionsUpdated', { detail: { question: questionData } }));
        }
    }

    deleteQuestion(questionId, round) {
        if (confirm('Are you sure you want to delete this question?')) {
            quizData.deleteQuestion(round, questionId);
            this.updateQuestionsTable(round);
        }
    }

    updateQuestionsTable(round) {
        const tbody = document.querySelector('#questions-table tbody');
        const roundTitle = document.getElementById('questions-round-title');
        
        roundTitle.textContent = `${this.formatRoundName(round)} Questions`;
        
        tbody.innerHTML = '';
        
        quizData.data.questions[round].forEach(question => {
            const row = document.createElement('tr');
            const topicLabel = question.topic ? `<div style="font-size:0.9rem;color:#666;margin-top:4px;">Topic: ${question.topic}</div>` : '';
            row.innerHTML = `
                <td>${question.id}</td>
                <td>${question.text.substring(0, 100)}${question.text.length > 100 ? '...' : ''}${topicLabel}</td>
                <td>${question.answer.substring(0, 50)}${question.answer.length > 50 ? '...' : ''}</td>
                <td>${question.points}</td>
                <td>${question.used ? '✅' : '❌'}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="adminPanel.showQuestionForm(${question.id}, '${round}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="adminPanel.deleteQuestion(${question.id}, '${round}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Rounds Control
    updateRoundControls(round) {
        const roundTitle = document.getElementById('current-round-title');
        roundTitle.textContent = `${this.formatRoundName(round)} Round`;

        // Show/hide rapid fire special section
        const rapidFireSection = document.getElementById('rapid-fire-section');
        const roundControls = document.getElementById('round-controls');
        const topicControls = document.getElementById('topic-controls');

        if (round === 'rapid') {
            if (rapidFireSection) rapidFireSection.classList.remove('d-none');
            if (roundControls) roundControls.classList.add('d-none');
            if (topicControls) topicControls.classList.add('d-none');
        } else if (round === 'topic') {
            if (rapidFireSection) rapidFireSection.classList.add('d-none');
            if (topicControls) topicControls.classList.remove('d-none');
            if (roundControls) roundControls.classList.remove('d-none');
            // Populate topic selection dropdown and questions table
            this.updateAdminTopicControls();
        } else {
            if (rapidFireSection) rapidFireSection.classList.add('d-none');
            if (roundControls) roundControls.classList.remove('d-none');
            if (topicControls) topicControls.classList.add('d-none');
        }

        // Treat Jeopardy like other rounds in the round control: enable the normal question dropdown
        const jeopardyRoundControls = document.getElementById('jeopardy-round-controls');
        const normalQuestionSelect = document.getElementById('round-question');
        if (jeopardyRoundControls) {
            jeopardyRoundControls.classList.add('d-none');
            jeopardyRoundControls.style.display = 'none';
        }
        if (normalQuestionSelect) normalQuestionSelect.disabled = false;
        this.updateQuestionDropdown(round);
        this.updateTeamDropdown();

        // Update the correct answer preview based on current displayed question
        try {
            const answerEl = document.getElementById('round-current-answer');
            if (answerEl) {
                if (quizData.data.currentQuestion && quizData.data.currentQuestion.answer) {
                    answerEl.textContent = quizData.data.currentQuestion.answer;
                } else {
                    // If no currentQuestion, attempt to show selected question's answer
                    const questionSelect = document.getElementById('round-question');
                    if (questionSelect && questionSelect.value) {
                        const qid = parseInt(questionSelect.value);
                        const q = (quizData.data.questions[round] || []).find(x => parseInt(x.id) === qid);
                        answerEl.textContent = q && q.answer ? q.answer : '—';
                    } else {
                        answerEl.textContent = '—';
                    }
                }
            }
        } catch (err) {
            console.error('Error updating round controls answer area:', err);
        }
    }

    // Admin topic controls for Topic Selection round
    updateAdminTopicControls() {
        const topicSelect = document.getElementById('admin-topic-select');
        const questionsTableBody = document.querySelector('#admin-topic-questions-table tbody');
        if (!topicSelect || !questionsTableBody) return;

        // Populate topic dropdown
        const topics = Array.isArray(quizData.data.topics) ? quizData.data.topics : [];
        topicSelect.innerHTML = '';
        topics.forEach(topic => {
            const opt = document.createElement('option');
            opt.value = topic;
            opt.textContent = topic;
            topicSelect.appendChild(opt);
        });

        // Handler to update questions table when topic changes
        const updateQuestionsForTopic = () => {
            const selectedTopic = topicSelect.value;
            const questions = (quizData.data.questions.topic || []).filter(q => String(q.topic || '').toLowerCase() === String(selectedTopic).toLowerCase());
            questionsTableBody.innerHTML = '';
            if (questions.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="5" style="text-align:center;color:#888;">No questions for this topic</td>';
                questionsTableBody.appendChild(row);
            } else {
                questions.forEach(q => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${q.id}</td>
                        <td>${q.text.substring(0, 100)}${q.text.length > 100 ? '...' : ''}</td>
                        <td>${q.answer.substring(0, 50)}${q.answer.length > 50 ? '...' : ''}</td>
                        <td>${q.points}</td>
                        <td>${q.used ? '✅' : '❌'}</td>
                    `;
                    questionsTableBody.appendChild(row);
                });
            }
        };

        topicSelect.onchange = updateQuestionsForTopic;
        // Initialize table for first topic
        if (topics.length > 0) {
            topicSelect.value = topics[0];
            updateQuestionsForTopic();
        } else {
            questionsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">No topics available</td></tr>';
        }
    }

    updateQuestionDropdown(round) {
        const questionSelect = document.getElementById('round-question');
        if (!questionSelect) return;
        const currentValue = questionSelect.value; // Preserve current selection
        questionSelect.innerHTML = '<option value="">Select a question</option>';

        // For topic selection round, filter by selected topic
        if (round === 'topic') {
            const topicSelect = document.getElementById('admin-topic-select');
            const selectedTopic = topicSelect ? topicSelect.value : '';
            const questions = (quizData.data.questions.topic || []).filter(q => String(q.topic || '').toLowerCase() === String(selectedTopic).toLowerCase());
            questions.forEach(question => {
                const option = document.createElement('option');
                option.value = question.id;
                option.textContent = `Q${question.id}: ${question.text.substring(0, 50)}...`;
                option.disabled = question.used;
                questionSelect.appendChild(option);
            });
        } else {
            (quizData.data.questions[round] || []).forEach(question => {
                const option = document.createElement('option');
                option.value = question.id;
                option.textContent = `Q${question.id}: ${question.text.substring(0, 50)}...`;
                option.disabled = question.used;
                questionSelect.appendChild(option);
            });
        }

        // Restore the previously selected question if it still exists
        if (currentValue) {
            questionSelect.value = currentValue;
        }
    }
    // Ensure question dropdown updates when topic changes in topic selection round
    updateAdminTopicControls() {
        const topicSelect = document.getElementById('admin-topic-select');
        const questionsTableBody = document.querySelector('#admin-topic-questions-table tbody');
        if (!topicSelect || !questionsTableBody) return;

        // Populate topic dropdown
        const topics = Array.isArray(quizData.data.topics) ? quizData.data.topics : [];
        topicSelect.innerHTML = '';
        topics.forEach(topic => {
            const opt = document.createElement('option');
            opt.value = topic;
            opt.textContent = topic;
            topicSelect.appendChild(opt);
        });

        // Handler to update questions table and dropdown when topic changes
        const updateQuestionsForTopic = () => {
            const selectedTopic = topicSelect.value;
            const questions = (quizData.data.questions.topic || []).filter(q => String(q.topic || '').toLowerCase() === String(selectedTopic).toLowerCase());
            questionsTableBody.innerHTML = '';
            if (questions.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="5" style="text-align:center;color:#888;">No questions for this topic</td>';
                questionsTableBody.appendChild(row);
            } else {
                questions.forEach(q => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${q.id}</td>
                        <td>${q.text.substring(0, 100)}${q.text.length > 100 ? '...' : ''}</td>
                        <td>${q.answer.substring(0, 50)}${q.answer.length > 50 ? '...' : ''}</td>
                        <td>${q.points}</td>
                        <td>${q.used ? '✅' : '❌'}</td>
                    `;
                    questionsTableBody.appendChild(row);
                });
            }
            // Update the question dropdown for topic round
            this.updateQuestionDropdown('topic');
        };

        topicSelect.onchange = updateQuestionsForTopic;
        // Initialize table and dropdown for first topic
        if (topics.length > 0) {
            topicSelect.value = topics[0];
            updateQuestionsForTopic();
        } else {
            questionsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">No topics available</td></tr>';
            this.updateQuestionDropdown('topic');
        }
    }

    // Topic publish helpers removed — topic selection in rounds UI was deleted per UX decision.

    // Populate the admin-side Jeopardy category and row selectors from saved board settings
    populateJeopardySelectors() {
        try {
            const board = quizData.data.jeopardyBoard || {};
            const cols = parseInt(board.cols) || 5;
            const rows = parseInt(board.rows) || (board.pointValues ? board.pointValues.length : 5);
            const categories = board.categories || Array.from({length: cols}, (_, i) => `Category ${i+1}`);
            const pointValues = board.pointValues || Array.from({length: rows}, (_, i) => (i+1)*100);

            const colSel = document.getElementById('jeopardy-col-select');
            const rowSel = document.getElementById('jeopardy-row-select');
            if (!colSel || !rowSel) return;

            // Populate categories (columns)
            colSel.innerHTML = '';
            for (let c = 1; c <= cols; c++) {
                const opt = document.createElement('option');
                opt.value = String(c);
                opt.textContent = `${c} — ${categories[c-1] || `Category ${c}`}`;
                colSel.appendChild(opt);
            }

            // Populate rows (point values)
            rowSel.innerHTML = '';
            for (let r = 1; r <= rows; r++) {
                const opt = document.createElement('option');
                opt.value = String(r);
                opt.textContent = `${r} — ${pointValues[r-1] || (r*100)} pts`;
                rowSel.appendChild(opt);
            }

            // Try to preserve previous selection if present
            if (!colSel.value) colSel.value = '1';
            if (!rowSel.value) rowSel.value = '1';
        } catch (error) {
            console.error('Error populating Jeopardy selectors:', error);
        }
    }

    // Find a Jeopardy question by row and column (1-based indices)
    getJeopardyQuestionByCoords(row, column) {
        try {
            const questions = quizData.data.questions.jeopardy || [];
            return questions.find(q => (parseInt(q.row) === parseInt(row)) && (parseInt(q.column) === parseInt(column)));
        } catch (error) {
            console.error('Error finding jeopardy question by coords:', error);
            return null;
        }
    }

    // Show the selected Jeopardy tile on the display (admin button handler)
    showJeopardyTileOnDisplay() {
        try {
            const colSel = document.getElementById('jeopardy-col-select');
            const rowSel = document.getElementById('jeopardy-row-select');
            if (!colSel || !rowSel) {
                this.showToast('Jeopardy selectors not found', 'error');
                return;
            }

            const col = parseInt(colSel.value);
            const row = parseInt(rowSel.value);

            const question = this.getJeopardyQuestionByCoords(row, col);
            if (!question) {
                this.showToast('No question assigned to that tile', 'warning');
                return;
            }

            // Set current question and display it
            quizData.setCurrentQuestion('jeopardy', question.id);
            quizData.setDisplayMode('question');
            quizData.saveData();
            this.log('Jeopardy tile shown', { row, column: col, questionId: question.id });
        } catch (error) {
            console.error('Error showing Jeopardy tile:', error);
            this.showToast('Error showing tile', 'error');
        }
    }

    updateTeamDropdown() {
        const teamSelect = document.getElementById('points-team');
        const rfTeamSelect = document.getElementById('rf-team-select');
        const prevTeam = teamSelect ? teamSelect.value : null;
        const prevRf = rfTeamSelect ? rfTeamSelect.value : null;

        if (teamSelect) teamSelect.innerHTML = '';
        if (rfTeamSelect) rfTeamSelect.innerHTML = '';

        quizData.data.teams.forEach(team => {
            const option1 = document.createElement('option');
            option1.value = String(team.id);
            option1.textContent = team.name;
            if (teamSelect) teamSelect.appendChild(option1);

            if (rfTeamSelect) {
                const option2 = document.createElement('option');
                option2.value = String(team.id);
                option2.textContent = team.name;
                rfTeamSelect.appendChild(option2);
            }
        });

        // Restore previous selection where possible. Prefer stored selection for rapid-fire.
        try {
            if (teamSelect && prevTeam && [...teamSelect.options].some(o => o.value === prevTeam)) {
                teamSelect.value = prevTeam;
            }

            if (rfTeamSelect) {
                const stored = (quizData.data.selectedRapidTeam !== undefined && quizData.data.selectedRapidTeam !== null) ? String(quizData.data.selectedRapidTeam) : null;
                if (stored && [...rfTeamSelect.options].some(o => o.value === stored)) {
                    rfTeamSelect.value = stored;
                } else if (prevRf && [...rfTeamSelect.options].some(o => o.value === prevRf)) {
                    rfTeamSelect.value = prevRf;
                }
            }
        } catch (err) {
            console.warn('Error restoring team dropdown selection:', err);
        }
    }

    showQuestionOnDisplay() {
        const round = this.currentControlRound;
        // Special handling for Jeopardy: use tile selectors
        if (round === 'jeopardy') {
            const colSel = document.getElementById('jeopardy-col-select');
            const rowSel = document.getElementById('jeopardy-row-select');
            if (!colSel || !rowSel) {
                this.showToast('Jeopardy selectors not available', 'error');
                return;
            }
            const col = parseInt(colSel.value);
            const row = parseInt(rowSel.value);
            const q = this.getJeopardyQuestionByCoords(row, col);
            if (!q) {
                this.showToast('No question assigned to that tile', 'warning');
                return;
            }
            quizData.setCurrentQuestion('jeopardy', q.id);
            quizData.setDisplayMode('question');
            // Update correct answer preview
            const answerEl = document.getElementById('round-current-answer');
            if (answerEl) answerEl.textContent = q.answer || '—';
            return;
        }

        // Topic Selection round: select a random unused question from selected topic
        if (round === 'topic') {
            const topicSelect = document.getElementById('admin-topic-select');
            const selectedTopic = topicSelect ? topicSelect.value : '';
            if (!selectedTopic) {
                this.showToast('Please select a topic first', 'warning');
                return;
            }
            // Get all unused questions for this topic
            const questions = (quizData.data.questions.topic || []).filter(q => String(q.topic || '').toLowerCase() === String(selectedTopic).toLowerCase());
            const unused = questions.filter(q => !q.used);
            let chosen = null;
            if (unused.length > 0) {
                chosen = unused[Math.floor(Math.random() * unused.length)];
            } else if (questions.length > 0) {
                chosen = questions[Math.floor(Math.random() * questions.length)];
            }
            if (!chosen) {
                this.showToast('No questions available for this topic', 'warning');
                return;
            }
            quizData.setCurrentQuestion('topic', chosen.id);
            quizData.setDisplayMode('question');
            // Sync dropdown selection
            const questionSelect = document.getElementById('round-question');
            if (questionSelect) questionSelect.value = chosen.id;
            // Update correct answer preview
            const answerEl = document.getElementById('round-current-answer');
            if (answerEl) answerEl.textContent = chosen.answer || '—';
            this.showToast(`Showing random question for topic: ${selectedTopic}`, 'info');
            return;
        }

        const questionSelect = document.getElementById('round-question');
        let questionId = questionSelect ? parseInt(questionSelect.value) : NaN;

        // If no explicit question selected, choose a random question from the round
        if (!questionId || Number.isNaN(questionId)) {
            const allQuestions = Array.isArray(quizData.data.questions[round]) ? quizData.data.questions[round] : [];
            if (allQuestions.length === 0) {
                this.showToast('No questions available for this round', 'warning');
                return;
            }

            // Prefer unused questions; fall back to all questions if none unused
            const unused = allQuestions.filter(q => !q.used);
            const pool = unused.length > 0 ? unused : allQuestions;

            const chosen = pool[Math.floor(Math.random() * pool.length)];
            if (!chosen) {
                this.showToast('Failed to select a random question', 'error');
                return;
            }

            questionId = chosen.id;
            if (questionSelect) questionSelect.value = questionId;
            // Update correct answer preview
            const answerEl = document.getElementById('round-current-answer');
            if (answerEl) answerEl.textContent = chosen.answer || '—';
            this.showToast(`Random question selected: Q${questionId}`, 'info');
        }

        quizData.setCurrentQuestion(round, questionId);
        quizData.setDisplayMode('question');
        // Sync dropdown selection
        if (questionSelect) questionSelect.value = questionId;
        // Update correct answer preview
        const answerEl = document.getElementById('round-current-answer');
        if (answerEl) {
            const q = (quizData.data.questions[round] || []).find(x => parseInt(x.id) === questionId);
            answerEl.textContent = q && q.answer ? q.answer : '—';
        }
    }

    markCorrectAnswer() {
        if (!quizData.data.currentQuestion) {
            this.showToast('No question is currently displayed', 'error');
            return;
        }
        
        const teamSelect = document.getElementById('points-team');
        if (!teamSelect) {
            this.showToast('Team selector not found', 'error');
            return;
        }
        
        const teamId = parseInt(teamSelect.value);
        if (!teamId) {
            this.showToast('Please select a team first', 'error');
            return;
        }
        
        const team = quizData.data.teams.find(t => t.id === teamId);
        if (!team) {
            this.showToast('Team not found', 'error');
            return;
        }
        
        const points = quizData.data.currentQuestion.points;
        quizData.updateTeamScore(teamId, points);
        quizData.markQuestionUsed(quizData.data.currentQuestion.round, quizData.data.currentQuestion.id);
        
        this.log('Answer marked correct', { 
            team: team.name, 
            points, 
            question: quizData.data.currentQuestion.text.substring(0, 50),
            newScore: team.score + points
        });
        
        // Show celebration on display
        quizData.setDisplayMode('celebration');
        setTimeout(() => {
            quizData.setDisplayMode('scoreboard');
        }, 3000);
    }

    markIncorrectAnswer() {
        if (!quizData.data.currentQuestion) {
            this.showToast('No question is currently displayed', 'error');
            return;
        }
        
        const teamSelect = document.getElementById('points-team');
        if (!teamSelect) {
            this.showToast('Team selector not found', 'error');
            return;
        }
        
        const teamId = parseInt(teamSelect.value);
        if (!teamId) {
            this.showToast('Please select a team first', 'error');
            return;
        }
        
        const team = quizData.data.teams.find(t => t.id === teamId);
        if (!team) {
            this.showToast('Team not found', 'error');
            return;
        }

        this.log('Answer marked incorrect', { 
            team: team.name, 
            question: quizData.data.currentQuestion.text.substring(0, 50)
        });
        this.showToast(`Marked as incorrect for ${team.name}`, 'info');
    }

    nextQuestion() {
        const round = this.currentControlRound;

        // Topic Selection round: next question from selected topic only
        if (round === 'topic') {
            const topicSelect = document.getElementById('admin-topic-select');
            const selectedTopic = topicSelect ? topicSelect.value : '';
            if (!selectedTopic) {
                this.showToast('Please select a topic first', 'warning');
                return;
            }
            const questions = (quizData.data.questions.topic || []).filter(q => String(q.topic || '').toLowerCase() === String(selectedTopic).toLowerCase());
            if (questions.length === 0) {
                this.showToast('No questions available for this topic', 'warning');
                return;
            }
            // Find current question index
            const currentId = quizData.data.currentQuestion ? quizData.data.currentQuestion.id : null;
            let idx = questions.findIndex(q => q.id === currentId);
            idx = idx < 0 ? -1 : idx;
            // Next question
            const nextIdx = idx + 1 < questions.length ? idx + 1 : 0;
            const nextQ = questions[nextIdx];
            if (nextQ) {
                quizData.setCurrentQuestion('topic', nextQ.id);
                quizData.setDisplayMode('question');
                // Sync dropdown selection
                const questionSelect = document.getElementById('round-question');
                if (questionSelect) questionSelect.value = nextQ.id;
                // Update correct answer preview
                const answerEl = document.getElementById('round-current-answer');
                if (answerEl) answerEl.textContent = nextQ.answer || '—';
                this.showToast(`Next question for topic: ${selectedTopic}`, 'info');
            } else {
                this.showToast('No next question found for this topic', 'warning');
            }
            return;
        }

        const allQuestions = Array.isArray(quizData.data.questions[round]) ? quizData.data.questions[round] : [];
        if (allQuestions.length === 0) {
            this.showToast('No questions available for this round', 'warning');
            return;
        }

        // Prefer unused questions; pick one at random from unused pool
        const unused = allQuestions.filter(q => !q.used);
        if (unused.length === 0) {
            this.showToast('All questions in this round have been used', 'warning');
            return;
        }

        const chosen = unused[Math.floor(Math.random() * unused.length)];
        const questionSelect = document.getElementById('round-question');
        if (questionSelect) questionSelect.value = chosen.id;
        // Update correct answer preview
        const answerEl = document.getElementById('round-current-answer');
        if (answerEl) answerEl.textContent = chosen.answer || '—';
        this.showToast(`Random question selected: Q${chosen.id}`, 'info');
        this.showQuestionOnDisplay();
    }

    prevQuestion() {
        const round = this.currentControlRound;

        // Topic Selection round: previous question from selected topic only
        if (round === 'topic') {
            const topicSelect = document.getElementById('admin-topic-select');
            const selectedTopic = topicSelect ? topicSelect.value : '';
            if (!selectedTopic) {
                this.showToast('Please select a topic first', 'warning');
                return;
            }
            const questions = (quizData.data.questions.topic || []).filter(q => String(q.topic || '').toLowerCase() === String(selectedTopic).toLowerCase());
            if (questions.length === 0) {
                this.showToast('No questions available for this topic', 'warning');
                return;
            }
            // Find current question index
            const currentId = quizData.data.currentQuestion ? quizData.data.currentQuestion.id : null;
            let idx = questions.findIndex(q => q.id === currentId);
            idx = idx < 0 ? 0 : idx;
            // Previous question
            const prevIdx = idx - 1 >= 0 ? idx - 1 : questions.length - 1;
            const prevQ = questions[prevIdx];
            if (prevQ) {
                quizData.setCurrentQuestion('topic', prevQ.id);
                quizData.setDisplayMode('question');
                // Sync dropdown selection
                const questionSelect = document.getElementById('round-question');
                if (questionSelect) questionSelect.value = prevQ.id;
                // Update correct answer preview
                const answerEl = document.getElementById('round-current-answer');
                if (answerEl) answerEl.textContent = prevQ.answer || '—';
                this.showToast(`Previous question for topic: ${selectedTopic}`, 'info');
            } else {
                this.showToast('No previous question found for this topic', 'warning');
            }
            return;
        }

        const currentQuestionId = quizData.data.currentQuestion ? quizData.data.currentQuestion.id : Infinity;

        // Find unused questions with id < currentQuestionId and pick the last one
        const candidates = quizData.getUnusedQuestions(round).filter(q => q.id < currentQuestionId);
        if (candidates.length === 0) {
            this.showToast('No previous unused question available', 'warning');
            return;
        }

        const prevQuestion = candidates[candidates.length - 1];
        if (prevQuestion) {
            document.getElementById('round-question').value = prevQuestion.id;
            // Update correct answer preview
            const answerEl = document.getElementById('round-current-answer');
            if (answerEl) answerEl.textContent = prevQuestion.answer || '—';
            this.showQuestionOnDisplay();
        } else {
            this.showToast('No previous question found', 'warning');
        }
    }

    stopRound() {
        // Stop the current round: clear current question and show round info
        try {
            quizData.data.currentQuestion = null;
            // Keep currentRound but switch display to round overview
            quizData.setDisplayMode('round');
            quizData.saveData();
            this.showToast('Round stopped', 'info');
            this.log('Round stopped by admin', { round: this.currentControlRound });
        } catch (error) {
            console.error('Error stopping round:', error);
            this.showToast('Error stopping round', 'error');
        }
    }

    showAnswer() {
        if (quizData.data.currentQuestion) {
            quizData.setDisplayMode('answer');
        } else {
            this.showToast('No question is currently displayed', 'error');
        }
    }

    // Rapid Fire Round Methods
    updateRapidFireCalculations() {
        try {
            const totalTimeInput = document.getElementById('rapid-fire-total-time');
            const questionCountInput = document.getElementById('rapid-fire-question-count');
            const timeCalcEl = document.getElementById('rapid-fire-time-calc');
            const timeCalcFullEl = document.getElementById('rapid-fire-time-calc-full');

            if (!totalTimeInput || !questionCountInput) return;

            const totalTime = parseInt(totalTimeInput.value) || 90;
            const questionCount = parseInt(questionCountInput.value) || 5;

            const timePerQuestion = Math.round(totalTime / questionCount);

            if (timeCalcEl) timeCalcEl.textContent = timePerQuestion;
            if (timeCalcFullEl) timeCalcFullEl.textContent = timePerQuestion;

            // Store in quizData for use when starting
            quizData.data.rapidFireSettings = {
                totalTime: totalTime,
                questionCount: questionCount,
                timePerQuestion: timePerQuestion
            };
        } catch (error) {
            console.error('Error updating rapid fire calculations:', error);
        }
    }

    startRapidFire() {
        try {
            // Get settings from UI
            const totalTimeInput = document.getElementById('rapid-fire-total-time');
            const questionCountInput = document.getElementById('rapid-fire-question-count');
            
            const totalTime = parseInt(totalTimeInput?.value) || 90;
            const desiredQuestionCount = parseInt(questionCountInput?.value) || 5;

            const rapidQuestions = quizData.data.questions.rapid || [];
            
            if (rapidQuestions.length === 0) {
                this.showToast('No questions available for Rapid Fire round', 'warning');
                return;
            }

            // Determine actual number of questions to use
            const actualQuestionCount = Math.min(desiredQuestionCount, rapidQuestions.length);

            // Reset used status for rapid fire questions
            rapidQuestions.forEach(q => q.used = false);
            quizData.saveData();

            // Shuffle and select random questions
            const shuffled = rapidQuestions.sort(() => 0.5 - Math.random());
            const selectedQuestions = shuffled.slice(0, actualQuestionCount);

            // Calculate time per question
            const timePerQuestion = totalTime / actualQuestionCount;

            // Store rapid fire state in quizData
            quizData.data.rapidFireActive = true;
            quizData.data.rapidFireQuestions = selectedQuestions.map(q => ({ ...q }));
            quizData.data.rapidFireCurrentIndex = 0;
            quizData.data.rapidFireStartTime = Date.now();
            quizData.data.rapidFireDuration = totalTime;
            quizData.data.rapidFireTimePerQuestion = timePerQuestion;

            // Set display mode to rapid fire
            quizData.setDisplayMode('rapidfire');
            quizData.setCurrentRound('rapid');

            // Show first question
            this.displayRapidFireQuestion(0);

            // Start single total-round countdown (no auto-advance)
            this.startRapidFireTimer();

            this.log('Rapid Fire Started', { 
                questionsCount: actualQuestionCount,
                totalTime: totalTime,
                timePerQuestion: Math.round(timePerQuestion)
            });

            this.showToast(`🚀 Rapid Fire Started! ${actualQuestionCount} questions • ${totalTime}s total • ≈ ${Math.round(timePerQuestion)}s/q`, 'success');
        } catch (error) {
            console.error('Error starting rapid fire:', error);
            this.showToast('Error starting Rapid Fire round', 'error');
        }
    }

    togglePauseRapidFire(buttonEl) {
        try {
            if (!quizData.data.rapidFireActive) {
                this.showToast('Rapid Fire is not active', 'warning');
                return;
            }

            if (quizData.data.rapidFirePaused) {
                // Resume
                this.resumeRapidFire();
                if (buttonEl) buttonEl.textContent = '⏸️ PAUSE';
            } else {
                // Pause
                this.pauseRapidFire();
                if (buttonEl) buttonEl.textContent = '▶️ RESUME';
            }
        } catch (error) {
            console.error('Error toggling pause:', error);
        }
    }

    pauseRapidFire() {
        try {
            if (!quizData.data.rapidFireActive || quizData.data.rapidFirePaused) return;
            // Mark paused and record timestamp
            quizData.data.rapidFirePaused = true;
            quizData.data.rapidFirePauseTime = Date.now();

            // Clear running timers
            if (window.rapidFireTimer) clearInterval(window.rapidFireTimer);

            quizData.saveData();
            this.log('Rapid Fire Paused');
        } catch (error) {
            console.error('Error pausing rapid fire:', error);
        }
    }

    resumeRapidFire() {
        try {
            if (!quizData.data.rapidFireActive || !quizData.data.rapidFirePaused) return;

            // Compute paused duration and adjust start time
            const pausedAt = quizData.data.rapidFirePauseTime || Date.now();
            const pausedDuration = Date.now() - pausedAt;
            quizData.data.rapidFireStartTime = (quizData.data.rapidFireStartTime || Date.now()) + pausedDuration;
            delete quizData.data.rapidFirePauseTime;
            quizData.data.rapidFirePaused = false;

            // Restart countdown only (no auto-advance)
            this.startRapidFireTimer();
            quizData.saveData();
            this.log('Rapid Fire Resumed');
        } catch (error) {
            console.error('Error resuming rapid fire:', error);
        }
    }

    nextRapidFireQuestion() {
        try {
            if (!quizData.data.rapidFireActive) {
                this.showToast('Rapid Fire is not active', 'warning');
                return;
            }

            const questions = quizData.data.rapidFireQuestions || [];
            let idx = typeof quizData.data.rapidFireCurrentIndex === 'number' ? quizData.data.rapidFireCurrentIndex : 0;
            const next = idx + 1;
            if (next >= questions.length) {
                this.endRapidFire();
                return;
            }

            this.displayRapidFireQuestion(next);
            // No auto-scheduling — manual progression only
        } catch (error) {
            console.error('Error advancing rapid fire question:', error);
        }
    }

    prevRapidFireQuestion() {
        try {
            if (!quizData.data.rapidFireActive) {
                this.showToast('Rapid Fire is not active', 'warning');
                return;
            }

            const questions = quizData.data.rapidFireQuestions || [];
            let idx = typeof quizData.data.rapidFireCurrentIndex === 'number' ? quizData.data.rapidFireCurrentIndex : 0;
            const prev = Math.max(0, idx - 1);
            if (prev === idx) {
                this.showToast('Already at the first question', 'info');
                return;
            }

            this.displayRapidFireQuestion(prev);
        } catch (error) {
            console.error('Error going to previous rapid fire question:', error);
        }
    }

    startRapidFireTimer() {
        try {
            // Clear any existing rapid fire timer
            if (window.rapidFireTimer) {
                clearInterval(window.rapidFireTimer);
            }

            const totalTime = quizData.data.rapidFireDuration || 90;

            // Update timer and progress bar every 200ms (only countdown, no auto-advance)
            window.rapidFireTimer = setInterval(() => {
                try {
                    const elapsedTime = (Date.now() - (quizData.data.rapidFireStartTime || Date.now())) / 1000;
                    const timeRemaining = Math.max(0, totalTime - elapsedTime);
                    const progress = (elapsedTime / totalTime) * 100;

                    // Update timer display in admin panel (total remaining)
                    const timerEl = document.getElementById('rapid-fire-timer');
                    if (timerEl) {
                        const seconds = Math.ceil(timeRemaining);
                        timerEl.textContent = `${seconds}s`;
                        timerEl.style.color = seconds <= 10 ? '#ff4444' : '#333';
                    }

                    // Progress bar update in admin panel (overall round progress)
                    const progressBar = document.getElementById('rapid-fire-progress');
                    if (progressBar) {
                        progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
                    }

                    // End round when total time expired
                    if (timeRemaining <= 0) {
                        clearInterval(window.rapidFireTimer);
                        this.endRapidFire();
                    }
                } catch (error) {
                    console.error('Error in timer update:', error);
                }
            }, 200);

        } catch (error) {
            console.error('Error in rapid fire timer:', error);
        }
    }

    displayRapidFireQuestion(index) {
        try {
            const questions = quizData.data.rapidFireQuestions;
            
            if (index >= 0 && index < questions.length) {
                const question = questions[index];
                
                // Set as current question
                quizData.data.currentQuestion = {
                    round: 'rapid',
                    id: question.id,
                    text: question.text,
                    points: question.points,
                    type: question.type,
                    media: question.media,
                    answer: question.answer
                };

                // Update question counter in UI
                const counterEl = document.getElementById('rapid-fire-counter');
                if (counterEl) {
                    counterEl.textContent = `Question ${index + 1} / ${questions.length}`;
                }

                // Update admin rapid-fire UI: show current question and real answer for monitoring
                try {
                    const rfQ = document.getElementById('rf-current-question-text');
                    const rfA = document.getElementById('rf-current-answer');
                    if (rfQ) rfQ.textContent = question.text || '—';
                    if (rfA) rfA.textContent = question.answer || '—';
                } catch (err) {
                    console.warn('Unable to update rapid fire admin UI elements', err);
                }

                // Update current index
                quizData.data.rapidFireCurrentIndex = index;
                quizData.saveData();

                // Update display
                window.dispatchEvent(new CustomEvent('quizDataUpdated', { detail: { source: 'rapidfire' } }));
            }
        } catch (error) {
            console.error('Error displaying rapid fire question:', error);
        }
    }

    endRapidFire() {
        try {
            if (window.rapidFireTimer) {
                clearInterval(window.rapidFireTimer);
            }
            if (window.rapidFireQuestionTimer) {
                clearTimeout(window.rapidFireQuestionTimer);
            }

            // Reset rapid fire state
            quizData.data.rapidFireActive = false;
            quizData.setDisplayMode('scoreboard');
            quizData.saveData();

            this.log('Rapid Fire Ended', {
                totalTime: quizData.data.rapidFireDuration,
                questionsDisplayed: quizData.data.rapidFireCurrentIndex + 1
            });

            this.showToast('⏱️ Rapid Fire Round Complete! All questions displayed.', 'success');
        } catch (error) {
            console.error('Error ending rapid fire:', error);
        }
    }

    stopRapidFire() {
        try {
            if (window.rapidFireTimer) {
                clearInterval(window.rapidFireTimer);
            }
            if (window.rapidFireQuestionTimer) {
                clearTimeout(window.rapidFireQuestionTimer);
            }

            quizData.data.rapidFireActive = false;
            // When stopping rapid fire, show normal banner (not full-screen)
            quizData.data.bannerFullscreen = false;
            quizData.setDisplayMode('banner');
            quizData.saveData();
            quizData.saveData();

            this.log('Rapid Fire Stopped', { stoppedAt: quizData.data.rapidFireCurrentIndex + 1 });
            this.showToast('Rapid Fire Round Stopped', 'info');
        } catch (error) {
            console.error('Error stopping rapid fire:', error);
        }
    }

    addPointsToTeam() {
        const teamSelect = document.getElementById('points-team');
        const pointsInput = document.getElementById('points-value');
        
        if (!teamSelect) {
            this.showToast('Team selector not found', 'error');
            return;
        }
        
        const teamId = parseInt(teamSelect.value);
        const points = parseInt(pointsInput?.value) || 10;
        
        if (!teamId) {
            this.showToast('Please select a team first', 'error');
            return;
        }
        
        if (points <= 0) {
            this.showToast('Please enter valid points', 'error');
            return;
        }
        
        const team = quizData.data.teams.find(t => t.id === teamId);
        if (team) {
            quizData.updateTeamScore(teamId, points);
            this.log('Points added', { team: team.name, points, newScore: team.score + points });
        }
    }

    subtractPointsFromTeam() {
        const teamSelect = document.getElementById('points-team');
        const pointsInput = document.getElementById('points-value');
        
        if (!teamSelect) {
            this.showToast('Team selector not found', 'error');
            return;
        }
        
        const teamId = parseInt(teamSelect.value);
        const points = parseInt(pointsInput?.value) || 10;
        
        if (!teamId) {
            this.showToast('Please select a team first', 'error');
            return;
        }
        
        if (points <= 0) {
            this.showToast('Please enter valid points', 'error');
            return;
        }
        
        const team = quizData.data.teams.find(t => t.id === teamId);
        if (team) {
            quizData.updateTeamScore(teamId, -points);
            this.log('Points subtracted', { team: team.name, points, newScore: team.score - points });
        }
    }

    // Scoreboard
    updateScoreboard() {
        const tbody = document.querySelector('#scoreboard-table tbody');
        tbody.innerHTML = '';
        const sortedTeams = quizData.getSortedTeams();
        console.log('[Admin] Scoreboard update:', sortedTeams);
        if (sortedTeams.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="4" style="text-align:center;color:#888;">No teams to display</td>`;
            tbody.appendChild(row);
        } else {
            sortedTeams.forEach((team, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${team.name}</td>
                    <td>${team.score}</td>
                    <td>${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''}</td>
                `;
                tbody.appendChild(row);
            });
        }
    }

    // Settings
    saveSettings(e) {
        e.preventDefault();
        
        const titleInput = document.getElementById('event-title');
        const subtitleInput = document.getElementById('event-subtitle');
        const bannerInput = document.getElementById('banner-image');
        const primaryInput = document.getElementById('primary-color');
        const accentInput = document.getElementById('accent-color');
        
        if (!titleInput || !subtitleInput || !bannerInput || !primaryInput || !accentInput) {
            this.showToast('Settings form is incomplete', 'error');
            return;
        }
        
        const settings = {
            eventTitle: titleInput.value.trim() || 'MITQuizmania',
            eventSubtitle: subtitleInput.value.trim() || 'Annual Quiz Competition',
            bannerImage: bannerInput.value.trim() || 'https://via.placeholder.com/1200x600',
            primaryColor: primaryInput.value,
            accentColor: accentInput.value
        };
        
        quizData.updateSettings(settings);
        this.log('Settings saved', settings);
        this.showToast('Settings saved successfully!', 'success');
    }

    updateSettingsForm() {
        document.getElementById('event-title').value = quizData.data.settings.eventTitle;
        document.getElementById('event-subtitle').value = quizData.data.settings.eventSubtitle;
        document.getElementById('banner-image').value = quizData.data.settings.bannerImage;
        document.getElementById('primary-color').value = quizData.data.settings.primaryColor;
        document.getElementById('accent-color').value = quizData.data.settings.accentColor;
        const autoSaveToggle = document.getElementById('auto-save-toggle');
        if (autoSaveToggle) {
            try {
                autoSaveToggle.checked = !!(quizData.data.settings && quizData.data.settings.autoSaveEnabled);
            } catch (err) {
                autoSaveToggle.checked = false;
            }
        }
    }

    // Media Handling Methods
    updateMediaInputAccept(mediaType) {
        const mediaInput = document.getElementById('question-media');
        if (!mediaInput) return;
        
        switch (mediaType) {
            case 'image':
                mediaInput.accept = 'image/*';
                break;
            case 'audio':
                mediaInput.accept = 'audio/*';
                break;
            case 'video':
                mediaInput.accept = 'video/*,.gif';
                break;
            default:
                mediaInput.accept = 'image/*,audio/*,video/*';
        }
    }

    handleMediaPreview(e) {
        try {
            const file = e.target.files[0];
            if (!file) {
                this.clearMediaPreview();
                return;
            }

            // Validate file size
            const maxSize = this.getMaxFileSize(file.type);
            if (file.size > maxSize) {
                const sizeMB = Math.round(maxSize / 1024 / 1024);
                this.showToast(`File too large! Maximum size is ${sizeMB}MB`, 'error');
                e.target.value = '';
                this.clearMediaPreview();
                return;
            }

            // Show loading status
            const statusEl = document.getElementById('upload-status');
            if (statusEl) {
                statusEl.innerHTML = '<small style="color: #666;">📤 Reading file...</small>';
            }

            const reader = new FileReader();
            
            reader.onload = (evt) => {
                try {
                    this.displayMediaPreview(file, evt.target.result);
                    if (statusEl) {
                        statusEl.innerHTML = '<small style="color: green;">✅ File ready for upload</small>';
                    }
                } catch (error) {
                    console.error('Error processing media:', error);
                    this.showToast('Error reading file', 'error');
                }
            };

            reader.onerror = () => {
                this.showToast('Error reading file', 'error');
                e.target.value = '';
                this.clearMediaPreview();
            };

            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error handling media preview:', error);
        }
    }

    getMaxFileSize(fileType) {
        if (fileType.startsWith('image/')) {
            return 5 * 1024 * 1024; // 5MB for images
        } else if (fileType.startsWith('audio/')) {
            return 10 * 1024 * 1024; // 10MB for audio
        } else if (fileType.startsWith('video/') || fileType === 'image/gif') {
            return 50 * 1024 * 1024; // 50MB for video
        }
        return 10 * 1024 * 1024; // 10MB default
    }

    displayMediaPreview(file, dataUrl) {
        try {
            const previewDiv = document.getElementById('media-preview');
            const previewContent = document.getElementById('preview-content');
            
            if (!previewDiv || !previewContent) return;

            previewContent.innerHTML = '';
            previewDiv.style.display = 'block';

            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = dataUrl;
                img.style.maxWidth = '100%';
                img.style.maxHeight = '200px';
                img.style.borderRadius = '5px';
                previewContent.appendChild(img);
            } else if (file.type.startsWith('audio/')) {
                const audio = document.createElement('audio');
                audio.src = dataUrl;
                audio.controls = true;
                audio.style.width = '100%';
                previewContent.appendChild(audio);
            } else if (file.type.startsWith('video/') || file.type === 'image/gif') {
                const video = document.createElement('video');
                video.src = dataUrl;
                video.controls = true;
                video.autoplay = true;
                video.loop = true;
                video.style.maxWidth = '100%';
                video.style.maxHeight = '200px';
                video.style.borderRadius = '5px';
                previewContent.appendChild(video);
            }
            
            const fileInfo = document.createElement('small');
            fileInfo.style.color = '#999';
            fileInfo.style.display = 'block';
            fileInfo.style.marginTop = '5px';
            fileInfo.textContent = `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`;
            previewContent.appendChild(fileInfo);
        } catch (error) {
            console.error('Error displaying preview:', error);
        }
    }

    clearMediaPreview() {
        const previewDiv = document.getElementById('media-preview');
        if (previewDiv) {
            previewDiv.style.display = 'none';
            previewDiv.innerHTML = '';
        }
        const statusEl = document.getElementById('upload-status');
        if (statusEl) {
            statusEl.innerHTML = '';
        }
    }

    // Utility Methods
    formatRoundName(round) {
        const roundNames = {
            general1: 'Semi-Final General',
            buzzer1: 'Semi-Final Buzzer',
            general2: 'Final General',
            topic: 'Topic Selection',
            extra: 'Extra Questions',
            rapid: 'Rapid Fire',
            jeopardy: 'Jeopardy'
        };
        
        return roundNames[round] || round;
    }

    getMimeType(mediaType) {
        const mimeTypes = {
            image: 'image/jpeg',
            audio: 'audio/mpeg',
            video: 'video/mp4'
        };
        return mimeTypes[mediaType] || 'application/octet-stream';
    }

    getExtension(mediaType) {
        const extensions = {
            image: 'jpg',
            audio: 'mp3',
            video: 'mp4'
        };
        return extensions[mediaType] || 'bin';
    }

    /* File System Access helpers (experimental) */
    async openDataFile() {
        try {
            if (window.showOpenFilePicker) {
                const [handle] = await window.showOpenFilePicker({ types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
                const file = await handle.getFile();
                const text = await file.text();
                const ok = quizData.importJSONString(text);
                if (ok) {
                    // remember handle for future saves
                    this._dataFileHandle = handle;
                    this.showToast('Data file opened and loaded', 'success');
                    this.updateUI();
                } else {
                    this.showToast('Failed to parse data file', 'danger');
                }
            } else {
                // fallback: prompt file input
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async () => {
                    const file = input.files[0];
                    if (!file) return;
                    const text = await file.text();
                    const ok = quizData.importJSONString(text);
                    if (ok) {
                        this.showToast('Data file imported', 'success');
                        this.updateUI();
                    } else {
                        this.showToast('Failed to import file', 'danger');
                    }
                };
                input.click();
            }
        } catch (error) {
            console.error('Error opening data file', error);
            this.showToast('Error opening file', 'danger');
        }
    }

    async saveDataFile() {
        try {
            // Ensure data saved in memory first
            const json = quizData.getJSONString();
            if (!json) return this.showToast('No data to save', 'danger');

            if (this._dataFileHandle && window.showSaveFilePicker) {
                // If we have an existing handle, try writing to it
                await this.writeStringToHandle(this._dataFileHandle, json);
                this.showToast('Data saved to chosen file', 'success');
                return;
            }

            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({ suggestedName: 'quiz-data.json', types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
                await this.writeStringToHandle(handle, json);
                this._dataFileHandle = handle;
                this.showToast('Data saved to disk', 'success');
            } else {
                // fallback: trigger download
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'quiz-data.json';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                this.showToast('Data downloaded (fallback save)', 'info');
            }
        } catch (error) {
            console.error('Error saving data file', error);
            this.showToast('Error saving file', 'danger');
        }
    }

    async writeStringToHandle(handle, contents) {
        try {
            // WritableStream approach for the File System Access API
            const writable = await handle.createWritable();
            await writable.write(contents);
            await writable.close();
            return true;
        } catch (error) {
            console.error('Error writing to handle', error);
            return false;
        }
    }

    // Open the code/file editor modal and allow selecting a file to edit
    async openCodeFileEditor() {
        try {
            const modal = document.getElementById('file-editor-modal');
            const textarea = document.getElementById('file-editor-textarea');
            const pathDisplay = document.getElementById('file-path-display');
            if (!modal || !textarea || !pathDisplay) return this.showToast('Editor elements missing', 'error');

            // Reset current state
            this._fileEditorHandle = null;
            pathDisplay.value = '';
            textarea.value = '';

            // Show modal
            modal.style.display = 'flex';

            // Setup buttons
            document.getElementById('close-file-editor').onclick = () => { modal.style.display = 'none'; };
            document.getElementById('choose-file-to-edit').onclick = async () => { await this.chooseFileToEdit(); };
            document.getElementById('save-file-editor').onclick = async () => { await this.saveFileEditor(); };
        } catch (error) {
            console.error('Error opening file editor', error);
            this.showToast('Error opening editor', 'danger');
        }
    }

    async chooseFileToEdit() {
        try {
            if (window.showOpenFilePicker) {
                const [handle] = await window.showOpenFilePicker({ multiple: false });
                this._fileEditorHandle = handle;
                const file = await handle.getFile();
                const text = await file.text();
                document.getElementById('file-editor-textarea').value = text;
                document.getElementById('file-path-display').value = file.name || 'Selected file';
            } else {
                // fallback to upload
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.js,.html,.css,.json,.txt';
                input.onchange = async () => {
                    const f = input.files[0];
                    if (!f) return;
                    const text = await f.text();
                    document.getElementById('file-editor-textarea').value = text;
                    document.getElementById('file-path-display').value = f.name;
                    this._fileEditorHandle = null; // no persistent handle in fallback
                };
                input.click();
            }
        } catch (error) {
            console.error('Error choosing file to edit', error);
            this.showToast('Error selecting file', 'danger');
        }
    }

    async saveFileEditor() {
        try {
            const content = document.getElementById('file-editor-textarea').value;
            if (!content) return this.showToast('No content to save', 'warning');

            if (this._fileEditorHandle && window.showSaveFilePicker) {
                await this.writeStringToHandle(this._fileEditorHandle, content);
                this.showToast('File saved', 'success');
                return;
            }

            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({ suggestedName: 'file.txt' });
                await this.writeStringToHandle(handle, content);
                this._fileEditorHandle = handle;
                this.showToast('File saved', 'success');
                return;
            }

            // Fallback: download as file
            const filename = document.getElementById('file-path-display').value || 'file.txt';
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            this.showToast('File downloaded (fallback save)', 'info');
        } catch (error) {
            console.error('Error saving edited file', error);
            this.showToast('Error saving file', 'danger');
        }
    }

    // Small non-blocking toast helper
    showToast(message, type = 'info') {
        try {
            const toast = document.getElementById('admin-toast');
            if (!toast) return;

            let bg = 'rgba(0,0,0,0.85)';
            if (type === 'success') bg = 'linear-gradient(90deg,#28a745,#20c997)';
            if (type === 'error') bg = 'linear-gradient(90deg,#e53935,#ff7043)';
            if (type === 'warning') bg = 'linear-gradient(90deg,#ffb300,#ff7043)';
            if (type === 'info') bg = 'linear-gradient(90deg,#3949ab,#1e88e5)';

            toast.style.background = bg;
            toast.textContent = message;
            toast.style.display = 'block';
            toast.style.opacity = '1';

            if (this._toastTimeout) clearTimeout(this._toastTimeout);
            this._toastTimeout = setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => { toast.style.display = 'none'; }, 300);
            }, 3500);
        } catch (e) {
            console.error('Toast error', e);
        }
    }

    // Export session log for record keeping
    exportSessionLog() {
        const logData = {
            eventTitle: quizData.data.settings.eventTitle,
            exportTime: new Date().toLocaleString(),
            totalEvents: this.sessionLog.length,
            finalScores: quizData.getSortedTeams(),
            sessionLog: this.sessionLog
        };
        
        const dataStr = JSON.stringify(logData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quiz-session-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        this.log('Session log exported');
    }
}

// Initialize admin panel
const adminPanel = new AdminPanel();

// Make available globally for onclick handlers
window.adminPanel = adminPanel;