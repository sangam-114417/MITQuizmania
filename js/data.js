// Data Management Module
class QuizDataManager {
    constructor() {
        this.data = {
            teams: [],
            questions: {
                general1: [],
                buzzer1: [],
                general2: [],
                topic: [],
                extra: [],
                rapid: [],
                jeopardy: []
            },
            currentRound: null,
            currentQuestion: null,
            displayMode: 'banner',
            // When true, display the banner as a full-screen overlay
            bannerFullscreen: false,
            timer: {
                active: false,
                duration: 90,
                remaining: 90
            },
            settings: {
                eventTitle: 'MITQuizmania',
                eventSubtitle: 'Annual Quiz Competition',
                bannerImage: 'media/eventbanner.jpg',
                primaryColor: '#1a237e',
                accentColor: '#00b0ff'
            }
            ,
            // Master list of topics (admin-managed). Used to populate topic selectors.
            topics: []
            ,
            // Customizable round rules (HTML allowed). Admin can edit these.
            roundRules: {
                general1: `
                <h3>Round Rules:</h3>
                <ul>
                    <li>5 questions per team</li>
                    <li>Mixed subjects: Business, IT, General Knowledge</li>
                    <li>10 points per correct answer</li>
                    <li>No negative marking</li>
                </ul>
            `,
                buzzer1: `
                <h3>Round Rules:</h3>
                <ul>
                    <li>20 questions total</li>
                    <li>First to buzz gets to answer</li>
                    <li>10 points for correct answer</li>
                    <li>-5 points for incorrect answer</li>
                    <li>Various subjects covered</li>
                </ul>
            `,
                rapid: `
                <h3>Round Rules:</h3>
                <ul>
                    <li>90 seconds time limit</li>
                    <li>10 questions to answer</li>
                    <li>5 points per correct answer</li>
                    <li>No penalty for wrong answers</li>
                    <li>Team can pass on questions</li>
                </ul>
            `,
                jeopardy: `
                <h3>Round Rules:</h3>
                <ul>
                    <li>Choose questions by point value (5, 10, 25, 50)</li>
                    <li>Higher points = harder questions</li>
                    <li>May include audio/visual questions</li>
                    <li>Correct answer adds points</li>
                    <li>Wrong answer deducts points</li>
                </ul>
            `
            }
        };
        
        this.loadData();
        this.setupStorageListener();
        this.validateData();
    }

    // Validate data integrity
    validateData() {
        try {
            // Ensure all required round categories exist
            const requiredRounds = ['general1', 'buzzer1', 'general2', 'topic', 'extra', 'rapid', 'jeopardy'];
            requiredRounds.forEach(round => {
                if (!this.data.questions[round]) {
                    this.data.questions[round] = [];
                }
                if (!Array.isArray(this.data.questions[round])) {
                    this.data.questions[round] = [];
                }
            });
            
            // Ensure teams array is valid
            if (!Array.isArray(this.data.teams)) {
                this.data.teams = [];
            }

            // Ensure topics array exists
            if (!Array.isArray(this.data.topics)) {
                this.data.topics = [];
            }

            // Ensure topic pool/queue and mode defaults exist for topic-round behavior
            if (!Array.isArray(this.data.topicPool)) this.data.topicPool = [];
            if (!Array.isArray(this.data.topicQueue)) this.data.topicQueue = [];
            if (typeof this.data.topicTurnByTurn !== 'boolean') this.data.topicTurnByTurn = false;
            if (typeof this.data.selectedTopic === 'undefined') this.data.selectedTopic = null;
            
            // Validate team objects
            this.data.teams = this.data.teams.filter(team => 
                team && team.id && team.name && typeof team.score === 'number'
            );
            
            console.log('Data validation passed');
        } catch (error) {
            console.error('Data validation error:', error);
        }
                    // Track whether we've already notified admin about localStorage unavailability
                    this._localStorageWarned = false;
    }

    // Load data from localStorage
    loadData() {
        try {
            let savedData = null;
            try {
                savedData = localStorage.getItem('mitQuizmaniaData');
            } catch (lsErr) {
                console.warn('localStorage not available:', lsErr);
            }

            if (!savedData) {
                try {
                    savedData = sessionStorage.getItem('mitQuizmaniaData');
                    if (savedData) console.log('Loaded data from sessionStorage fallback.');
                } catch (ssErr) {
                    console.warn('sessionStorage not available:', ssErr);
                }
            }

            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.data = { ...this.data, ...parsedData };
            } else {
                this.initializeSampleData();
            }
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
            console.log('Initializing with sample data');
            this.initializeSampleData();
        }
    }

    // Save data to localStorage
    saveData() {
        try {
            this.validateData();
            const json = JSON.stringify(this.data);

            try {
                localStorage.setItem('mitQuizmaniaData', json);
                // Trigger storage event for cross-tab communication
                window.dispatchEvent(new Event('storage'));
                console.log('Data saved successfully (localStorage).');
                return true;
            } catch (lsErr) {
                console.warn('localStorage save failed:', lsErr);

                // Try sessionStorage as a short-lived fallback
                try {
                    sessionStorage.setItem('mitQuizmaniaData', json);
                    console.log('Data saved to sessionStorage as fallback.');
                    // Show a gentle informational toast only once per session to avoid spamming the admin
                    if (window.adminPanel && typeof window.adminPanel.showToast === 'function' && !this._localStorageWarned) {
                        window.adminPanel.showToast('localStorage not available — data saved to sessionStorage temporarily.', 'info');
                        this._localStorageWarned = true;
                    }
                    // Report success so callers treat this as a successful save
                    return true;
                } catch (ssErr) {
                    console.warn('sessionStorage save failed:', ssErr);
                }

                // Try to write to an open file handle via adminPanel if available
                const tryFileSave = async () => {
                    try {
                        const admin = window.adminPanel;
                        if (admin && admin._dataFileHandle && typeof admin.writeStringToHandle === 'function') {
                            const ok = await admin.writeStringToHandle(admin._dataFileHandle, json);
                            if (ok) {
                                console.log('Data saved to file via adminPanel handle.');
                                if (admin.showToast) admin.showToast('Data saved to chosen file (fallback).', 'success');
                                return true;
                            }
                        }
                    } catch (fileErr) {
                        console.warn('Saving to file handle failed:', fileErr);
                    }
                    return false;
                };

                // Fire async attempt to save to file; if it fails, fall back to download
                tryFileSave().then(ok => {
                    if (!ok) {
                        try {
                            const blob = new Blob([json], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'quiz-data-backup.json';
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                            if (window.adminPanel && typeof window.adminPanel.showToast === 'function') {
                                window.adminPanel.showToast('localStorage not available — data downloaded as backup.', 'info');
                            } else {
                                console.warn('localStorage not available — data downloaded as backup.');
                            }
                        } catch (dlErr) {
                            console.error('Failed to download backup:', dlErr);
                            if (window.adminPanel && typeof window.adminPanel.showToast === 'function') {
                                window.adminPanel.showToast('Failed to save data to localStorage and backup download failed.', 'error');
                            }
                        }
                    }
                });
                return false;
            }
        } catch (error) {
            console.error('Error saving data:', error);
            if (window.adminPanel && typeof window.adminPanel.showToast === 'function') {
                window.adminPanel.showToast('Failed to save data. See console for details.', 'error');
            }
            return false;
        }
    }

    // Initialize with sample data
    initializeSampleData() {
        this.data.teams = [
            { id: 1, name: 'Team Alpha', members: 'John, Jane', score: 0, color: '#FF6B6B' },
            { id: 2, name: 'Team Beta', members: 'Mike, Sarah', score: 0, color: '#4ECDC4' },
            { id: 3, name: 'Team Gamma', members: 'Alex, Emma', score: 0, color: '#45B7D1' },
            { id: 4, name: 'Team Delta', members: 'Chris, Lisa', score: 0, color: '#FFA07A' }
        ];

        this.data.questions.general1 = [
            { 
                id: 1, 
                text: 'What is the capital of France?', 
                answer: 'Paris', 
                points: 10, 
                used: false,
                type: 'text'
            },
            { 
                id: 2, 
                text: 'Who wrote "Romeo and Juliet"?', 
                answer: 'William Shakespeare', 
                points: 10, 
                used: false,
                type: 'text'
            }
        ];

        this.data.questions.rapid = [
            { id: 1, text: 'What is 7 × 8?', answer: '56', points: 10, used: false, type: 'text' },
            { id: 2, text: 'Name the smallest planet in our solar system.', answer: 'Mercury', points: 10, used: false, type: 'text' },
            { id: 3, text: 'How many continents are there?', answer: '7', points: 10, used: false, type: 'text' },
            { id: 4, text: 'What is the chemical symbol for Gold?', answer: 'Au', points: 10, used: false, type: 'text' },
            { id: 5, text: 'Who painted the Mona Lisa?', answer: 'Leonardo da Vinci', points: 10, used: false, type: 'text' },
            { id: 6, text: 'What is the largest ocean on Earth?', answer: 'Pacific Ocean', points: 10, used: false, type: 'text' },
            { id: 7, text: 'In which year did the Titanic sink?', answer: '1912', points: 10, used: false, type: 'text' },
            { id: 8, text: 'How many bones are in the human body?', answer: '206', points: 10, used: false, type: 'text' },
            { id: 9, text: 'What is the hardest natural substance on Earth?', answer: 'Diamond', points: 10, used: false, type: 'text' },
            { id: 10, text: 'Who was the first President of the United States?', answer: 'George Washington', points: 10, used: false, type: 'text' }
        ];

        this.saveData();
    }

    // Team Management
    addTeam(team) {
        try {
            const newId = this.data.teams.length > 0 ? 
                Math.max(...this.data.teams.map(t => t.id)) + 1 : 1;
            
            this.data.teams.push({
                id: newId,
                name: team.name || `Team ${newId}`,
                members: team.members || '',
                score: team.score || 0,
                color: team.color || this.generateTeamColor(),
                eliminated: false
            });
            
            this.saveData();
            window.dispatchEvent(new CustomEvent('quizTeamsUpdated', { detail: { action: 'add', team: team } }));
            console.log('Team added:', team.name);
        } catch (error) {
            console.error('Error adding team:', error);
        }
    }

    updateTeam(teamId, updates) {
        try {
            const team = this.data.teams.find(t => t.id === teamId);
            if (team) {
                Object.assign(team, updates);
                this.saveData();
                window.dispatchEvent(new CustomEvent('quizTeamsUpdated', { detail: { action: 'update', teamId, updates } }));
                console.log('Team updated:', teamId);
            } else {
                console.warn('Team not found:', teamId);
            }
        } catch (error) {
            console.error('Error updating team:', error);
        }
    }

    deleteTeam(teamId) {
        try {
            const initialLength = this.data.teams.length;
            this.data.teams = this.data.teams.filter(t => t.id !== teamId);
            if (this.data.teams.length < initialLength) {
                this.saveData();
                window.dispatchEvent(new CustomEvent('quizTeamsUpdated', { detail: { action: 'delete', teamId } }));
                console.log('Team deleted:', teamId);
            }
        } catch (error) {
            console.error('Error deleting team:', error);
        }
    }

    markTeamEliminated(teamId, eliminated = true) {
        try {
            const team = this.data.teams.find(t => t.id === teamId);
            if (team) {
                team.eliminated = eliminated;
                this.saveData();
                console.log('Team eliminated status updated:', teamId, eliminated);
            }
        } catch (error) {
            console.error('Error marking team as eliminated:', error);
        }
    }

    // Question Management
    addQuestion(round, question) {
        const newId = this.data.questions[round].length > 0 ? 
            Math.max(...this.data.questions[round].map(q => q.id)) + 1 : 1;
        
        this.data.questions[round].push({
            id: newId,
            text: question.text,
            answer: question.answer,
            points: question.points,
            used: question.used || false,
            type: question.type || 'text',
            media: question.media || null,
            mediaType: question.mediaType || null,
            mediaName: question.mediaName || null,
            // Jeopardy-specific metadata
            row: question.row !== undefined ? question.row : null,
            column: question.column !== undefined ? question.column : null,
            displayAtStart: question.displayAtStart || false,
            showTeamChoices: question.showTeamChoices || false
        });
        
        this.saveData();
    }

    updateQuestion(round, questionId, updates) {
        const question = this.data.questions[round].find(q => q.id === questionId);
        if (question) {
            // Merge known properties explicitly to avoid accidentally dropping fields
            const keys = ['text','answer','points','used','type','media','mediaType','mediaName','row','column','displayAtStart','showTeamChoices'];
            keys.forEach(k => {
                if (updates[k] !== undefined) question[k] = updates[k];
            });
            this.saveData();
        }
    }

    deleteQuestion(round, questionId) {
        this.data.questions[round] = this.data.questions[round].filter(q => q.id !== questionId);
        this.saveData();
    }

    // Round Management
    setCurrentRound(round) {
        this.data.currentRound = round;
        this.saveData();
    }

    setCurrentQuestion(round, questionId) {
        const question = this.data.questions[round].find(q => q.id === questionId);
        if (question) {
            this.data.currentQuestion = {
                round,
                id: questionId,
                text: question.text,
                points: question.points,
                type: question.type,
                media: question.media,
                answer: question.answer,
                // include Jeopardy metadata if present so display can render modal correctly
                row: question.row !== undefined ? question.row : null,
                column: question.column !== undefined ? question.column : null,
                displayAtStart: question.displayAtStart || false,
                showTeamChoices: question.showTeamChoices || false,
                used: question.used || false
            };
            this.saveData();
        }
    }

    markQuestionUsed(round, questionId) {
        const question = this.data.questions[round].find(q => q.id === questionId);
        if (question) {
            question.used = true;
            this.saveData();
        }
    }

    // Score Management
    updateTeamScore(teamId, points) {
        const team = this.data.teams.find(t => t.id === teamId);
        if (team) {
            team.score += points;
            this.saveData();
        }
    }

    resetAllScores() {
        this.data.teams.forEach(team => team.score = 0);
        this.saveData();
    }

    // Display Management
    setDisplayMode(mode) {
        this.data.displayMode = mode;
        this.saveData();
    }

    // Timer Management
    startTimer(duration = 90) {
        this.data.timer = {
            active: true,
            duration: duration,
            remaining: duration,
            startTime: Date.now()
        };
        this.saveData();
    }

    stopTimer() {
        this.data.timer.active = false;
        this.saveData();
    }

    // Settings Management
    updateSettings(newSettings) {
        this.data.settings = { ...this.data.settings, ...newSettings };
        this.saveData();
    }

    // Utility Methods
    generateTeamColor() {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
        return colors[this.data.teams.length % colors.length];
    }

    getUnusedQuestions(round) {
        return this.data.questions[round].filter(q => !q.used);
    }

    getSortedTeams() {
        return [...this.data.teams]
            .filter(team => !team.eliminated)
            .sort((a, b) => b.score - a.score);
    }

    getAllTeams() {
        return [...this.data.teams].sort((a, b) => b.score - a.score);
    }

    // Storage event listener for cross-tab communication
    setupStorageListener() {
        window.addEventListener('storage', (event) => {
            try {
                if (event.key === 'mitQuizmaniaData' || event.key === null) {
                    this.loadData();
                    // Dispatch custom event to notify components of data change
                    window.dispatchEvent(new CustomEvent('quizDataUpdated', {
                        detail: { source: 'storage' }
                    }));
                    console.log('Data updated from storage event');
                }
            } catch (error) {
                console.error('Error handling storage event:', error);
            }
        });

        // Listen for visibility change to sync when tab becomes active
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                try {
                    this.loadData();
                    window.dispatchEvent(new CustomEvent('quizDataUpdated', {
                        detail: { source: 'visibility' }
                    }));
                    console.log('Data synced on tab visibility');
                } catch (error) {
                    console.error('Error syncing data on visibility:', error);
                }
            }
        });
    }

    // Export/Import functionality
    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        return URL.createObjectURL(dataBlob);
    }

    // Return JSON string of the data (useful for File System Access API)
    getJSONString() {
        try {
            return JSON.stringify(this.data, null, 2);
        } catch (error) {
            console.error('Failed to stringify data', error);
            return null;
        }
    }

    // Import from a JSON string (used by admin when reading a file)
    importJSONString(jsonString) {
        try {
            const parsed = JSON.parse(jsonString);
            if (parsed && typeof parsed === 'object') {
                this.data = parsed;
                this.validateData();
                this.saveData();
                // notify other tabs
                window.dispatchEvent(new Event('quizDataImported'));
                return true;
            }
        } catch (error) {
            console.error('Failed to import JSON string', error);
        }
        return false;
    }

    importData(jsonData) {
        try {
            const importedData = JSON.parse(jsonData);
            this.data = { ...this.data, ...importedData };
            this.saveData();
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
}

// Create global instance
const quizData = new QuizDataManager();

// Export for use in other modules
export default quizData;