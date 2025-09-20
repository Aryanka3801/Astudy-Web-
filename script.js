// Data Models and Constants
const SUBJECTS = {
    PHYSICS: 'Physics',
    CHEMISTRY: 'Chemistry',
    MATHS: 'Maths'
};

const CHAPTERS = {
    Physics: {
        '12th': [
            "Rotational Dynamics",
            "Mechanical Properties of Fluids",
            "Kinetic Theory of Gases and Radiation",
            "Thermodynamics",
            "Oscillations",
            "Superposition of Waves",
            "Wave Optics",
            "Electrostatics",
            "Current Electricity",
            "Magnetic Fields due to Electric Current",
            "Magnetic Materials",
            "Electromagnetic Induction",
            "AC Circuits",
            "Dual Nature of Radiation and Matter",
            "Structure of Atoms and Nuclei",
            "Semiconductor Devices"
        ],
        '11th': [
            "Motion in a Plane",
            "Laws of Motion",
            "Gravitation",
            "Thermal Properties of Matter",
            "Sound",
            "Optics",
            "Electrostatics(11th)",
            "Semiconductors"
        ]
    },
    Chemistry: {
        '12th': [
            "Solid State",
            "Solutions",
            "Ionic Equilibria",
            "Chemical Thermodynamics",
            "Electrochemistry",
            "Chemical Kinetics",
            "Elements of Groups 16, 17 and 18",
            "Transition and Inner Transition Elements",
            "Coordination Compounds",
            "Halogen Derivatives",
            "Alcohols, Phenols and Ethers",
            "Aldehydes, Ketones and Carboxylic Acids",
            "Amines",
            "Biomolecules",
            "Introduction to Polymer Chemistry",
            "Green Chemistry and Nanochemistry"
        ],
        '11th': [
            "Some Basic Concepts of Chemistry",
            "Structure of Atom",
            "Chemical Bonding",
            "Redox Reactions",
            "Elements of Group 1 and Group 2",
            "States of Matter (Gaseous and Liquid States)",
            "Adsorption and Colloids (Surface Chemistry)",
            "Hydrocarbons",
            "Basic Principles of Organic Chemistry"
        ]
    },
    Maths: {
        '12th': [
            "Mathematical Logic",
            "Matrices",
            "Trigonometric Functions",
            "Pair of Straight Lines",
            "Vectors",
            "Line and Plane",
            "Linear Programming",
            "Differentiation",
            "Applications of Derivatives",
            "Indefinite Integration",
            "Definite Integration",
            "Application of Definite Integration",
            "Differential Equations",
            "Probability Distributions",
            "Binomial Distribution"
        ],
        '11th': [
            "Trigonometry II",
            "Straight Line",
            "Circle",
            "Measures of Dispersion",
            "Probability",
            "Complex Numbers",
            "Permutations and Combinations",
            "Functions",
            "Limits",
            "Continuity"
        ]
    }
};

const TOTAL_CHAPTERS = {
    Physics: 24,
    Chemistry: 25,
    Maths: 25
};

// Application State
class StudyApp {
    constructor() {
        this.currentTab = 'progress';
        this.currentGrade = {
            physics: '12th',
            chemistry: '12th',
            maths: '12th'
        };
        
        // View pager properties
        this.tabNames = ['progress', 'physics', 'chemistry', 'maths', 'mcq', 'stopwatch', 'study-time'];
        this.currentPageIndex = 0;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isScrolling = false;
        this.mcqCount = 0;
        this.selectedSubject = 'Physics';
        this.stopwatchInterval = null;
        this.stopwatchTime = 0;
        this.isStopwatchRunning = false;
        this.studySession = {
            startTime: null,
            pausedTime: 0,
            isActive: false,
            isPaused: false
        };
        this.studyInterval = null;
        this.sessionHistory = {}; // Store individual sessions by date
        
        // Authentication state
        this.currentUser = null;
        this.isSignUpMode = false;
        this.dataLoaded = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupAuthenticationListeners();
        this.initFirebaseAuth();
        this.calculateDaysLeft();
        // loadChapters will be called after data is loaded
    }

    // Firebase Authentication Setup
    initFirebaseAuth() {
        // Wait for Firebase to be loaded with timeout
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        
        const checkFirebase = () => {
            if (typeof window.firebaseAuth !== 'undefined' && window.firebaseAuthFunctions) {
                try {
                    const { onAuthStateChanged } = window.firebaseAuthFunctions;
                    
                    onAuthStateChanged(window.firebaseAuth, (user) => {
                        this.currentUser = user;
                        this.updateAuthUI();
                        
                        if (user) {
                            this.loadDataFromFirestore();
                        } else {
                            this.loadDataFromLocalStorage();
                        }
                    });
                } catch (error) {
                    console.error('Firebase auth initialization error:', error);
                    this.loadDataFromLocalStorage();
                }
            } else {
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(checkFirebase, 100);
                } else {
                    console.warn('Firebase failed to load, using local storage');
                    this.loadDataFromLocalStorage();
                }
            }
        };
        
        checkFirebase();
    }

    // Authentication UI Management
    updateAuthUI() {
        const signInBtnDrawer = document.getElementById('signInBtnDrawer');
        const logoutBtnDrawer = document.getElementById('logoutBtnDrawer');
        const userInfoDrawer = document.getElementById('userInfoDrawer');
        const userEmailDrawer = document.getElementById('userEmailDrawer');
        const authPrompt = document.getElementById('authPrompt');
        const migrationSection = document.getElementById('migrationSection');
        
        // Add null checks for all elements
        if (!signInBtnDrawer || !logoutBtnDrawer || !userInfoDrawer || !userEmailDrawer || !authPrompt) {
            console.warn('Authentication UI elements not found');
            return;
        }
        
        if (this.currentUser) {
            signInBtnDrawer.style.display = 'none';
            logoutBtnDrawer.style.display = 'block';
            userInfoDrawer.style.display = 'flex';
            userEmailDrawer.textContent = this.currentUser.email;
            authPrompt.style.display = 'none';
            if (migrationSection) migrationSection.style.display = 'block';
        } else {
            signInBtnDrawer.style.display = 'block';
            logoutBtnDrawer.style.display = 'none';
            userInfoDrawer.style.display = 'none';
            authPrompt.style.display = 'block';
            if (migrationSection) migrationSection.style.display = 'none';
        }
    }

    // Authentication Event Listeners
    setupAuthenticationListeners() {
        // Sign in button in drawer
        const signInBtnDrawer = document.getElementById('signInBtnDrawer');
        if (signInBtnDrawer) {
            signInBtnDrawer.addEventListener('click', () => {
                this.showAuthModal();
            });
        }
        
        // Prompt sign in button
        const promptSignInBtn = document.getElementById('promptSignInBtn');
        if (promptSignInBtn) {
            promptSignInBtn.addEventListener('click', () => {
                this.showAuthModal();
            });
        }
        
        // Logout button in drawer
        const logoutBtnDrawer = document.getElementById('logoutBtnDrawer');
        if (logoutBtnDrawer) {
            logoutBtnDrawer.addEventListener('click', () => {
                this.signOut();
            });
        }
        
        // Close auth modal
        const closeAuth = document.getElementById('closeAuth');
        if (closeAuth) {
            closeAuth.addEventListener('click', () => {
                this.hideAuthModal();
            });
        }
        
        // Auth form submit
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuthSubmit();
            });
        }
        
        // Toggle between sign in and sign up
        const authToggle = document.getElementById('authToggle');
        if (authToggle) {
            authToggle.addEventListener('click', () => {
                this.toggleAuthMode();
            });
        }

        // Data import functionality
        this.setupImportListeners();

        // Settings functionality
        this.setupSettingsListeners();

        // Load saved settings
        this.loadSettings();
    }

    // Data Management (Local Storage Fallback)
    getData(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch {
            return defaultValue;
        }
    }

    setData(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('Failed to save data:', e);
        }
    }

    // Helper function to clean data for Firestore
    cleanDataForFirestore(obj) {
        // Handle null/undefined
        if (obj === undefined) {
            return null;
        }
        if (obj === null) {
            return null;
        }
        
        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.filter(item => item !== undefined).map(item => this.cleanDataForFirestore(item));
        }
        
        // Handle objects
        if (typeof obj === 'object' && obj !== null) {
            const cleaned = {};
            for (const [key, value] of Object.entries(obj)) {
                if (value !== undefined) {
                    const cleanedValue = this.cleanDataForFirestore(value);
                    // Only add the field if it's not undefined after cleaning
                    if (cleanedValue !== undefined) {
                        cleaned[key] = cleanedValue;
                    }
                }
            }
            return cleaned;
        }
        
        // Handle primitives (string, number, boolean)
        if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
            return obj;
        }
        
        // For anything else, return null
        return null;
    }

    // Firestore Data Management
    async saveDataToFirestore() {
        if (!this.currentUser || !window.firebaseDb || !window.firebaseDbFunctions) {
            console.warn('Cannot save to Firestore: user not authenticated or Firebase not loaded');
            return;
        }
        
        try {
            const { doc, setDoc } = window.firebaseDbFunctions;
            const userDoc = doc(window.firebaseDb, 'users', this.currentUser.uid);
            
            // Clean the data before saving
            const cleanedData = {
                completedChapters: this.cleanDataForFirestore(this.completedChapters || {}),
                mcqCounts: this.cleanDataForFirestore(this.mcqCounts || {}),
                totalStudyMinutes: this.totalStudyMinutes || 0,
                dailyStudyTimes: this.cleanDataForFirestore(this.dailyStudyTimes || {}),
                sessionHistory: this.cleanDataForFirestore(this.sessionHistory || {}),
                studySession: this.cleanDataForFirestore(this.studySession || {
                    originalStartTime: null,
                    startTime: null,
                    pausedTime: 0,
                    isActive: false,
                    isPaused: false
                }),
                lastUpdated: new Date().toISOString()
            };
            
            await setDoc(userDoc, cleanedData, { merge: true });
            
            console.log('Data saved to Firestore successfully');
        } catch (error) {
            console.error('Error saving to Firestore:', error);
            console.error('Data that failed to save:', JSON.stringify({
                completedChapters: this.completedChapters,
                mcqCounts: this.mcqCounts,
                totalStudyMinutes: this.totalStudyMinutes,
                dailyStudyTimes: this.dailyStudyTimes,
                sessionHistory: this.sessionHistory,
                studySession: this.studySession
            }, null, 2));
            this.showToast('Failed to save progress to cloud');
            // Fallback to localStorage
            this.setData('completedChapters', this.completedChapters);
            this.setData('mcqCounts', this.mcqCounts);
            this.setData('totalStudyMinutes', this.totalStudyMinutes);
            this.setData('dailyStudyTimes', this.dailyStudyTimes);
            this.setData('sessionHistory', this.sessionHistory);
            this.setData('studySession', this.studySession);
        }
    }

    async loadDataFromFirestore() {
        if (!this.currentUser || !window.firebaseDb || !window.firebaseDbFunctions) {
            console.warn('Cannot load from Firestore: user not authenticated or Firebase not loaded');
            this.loadDataFromLocalStorage();
            return;
        }
        
        try {
            const { doc, getDoc } = window.firebaseDbFunctions;
            const userDoc = doc(window.firebaseDb, 'users', this.currentUser.uid);
            const docSnap = await getDoc(userDoc);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                this.completedChapters = data.completedChapters || {
                    Physics: [],
                    Chemistry: [],
                    Maths: []
                };
                this.mcqCounts = data.mcqCounts || {
                    Physics: 0,
                    Chemistry: 0,
                    Maths: 0
                };
                this.totalStudyMinutes = data.totalStudyMinutes || 0;
                this.dailyStudyTimes = data.dailyStudyTimes || {};
                this.sessionHistory = data.sessionHistory || {};
                this.studySession = data.studySession || {
                    originalStartTime: null,
                    startTime: null,
                    pausedTime: 0,
                    isActive: false,
                    isPaused: false
                };
                this.showToast('Progress loaded from cloud');
            } else {
                // First time user - check for existing localStorage data to migrate
                this.migrateFromLocalStorage();
            }
        } catch (error) {
            console.error('Error loading from Firestore:', error);
            this.loadDataFromLocalStorage();
            this.showToast('Using local data - cloud sync temporarily unavailable');
        }
        
        this.dataLoaded = true;
        this.updateUI();
        this.loadAllChapters();
    }
    
    // Migrate existing localStorage data to Firestore for new users
    migrateFromLocalStorage() {
        const localCompletedChapters = this.getData('completedChapters', null);
        const localMcqCounts = this.getData('mcqCounts', null);
        const localTotalStudyMinutes = this.getData('totalStudyMinutes', null);
        const localDailyStudyTimes = this.getData('dailyStudyTimes', null);
        const localSessionHistory = this.getData('sessionHistory', null);
        
        if (localCompletedChapters || localMcqCounts || localTotalStudyMinutes || localDailyStudyTimes || localSessionHistory) {
            // User has existing data, migrate it
            this.completedChapters = localCompletedChapters || {
                Physics: [],
                Chemistry: [],
                Maths: []
            };
            this.mcqCounts = localMcqCounts || {
                Physics: 0,
                Chemistry: 0,
                Maths: 0
            };
            this.totalStudyMinutes = localTotalStudyMinutes || 0;
            this.dailyStudyTimes = localDailyStudyTimes || {};
            this.sessionHistory = localSessionHistory || {};
            this.studySession = this.getData('studySession', {
                originalStartTime: null,
                startTime: null,
                pausedTime: 0,
                isActive: false,
                isPaused: false
            });
            
            // Save migrated data to Firestore
            this.saveDataToFirestore();
            this.showToast('Local progress migrated to cloud');
        } else {
            this.initializeDefaultData();
        }
    }

    loadDataFromLocalStorage() {
        this.completedChapters = this.getData('completedChapters', {
            Physics: [],
            Chemistry: [],
            Maths: []
        });
        this.mcqCounts = this.getData('mcqCounts', {
            Physics: 0,
            Chemistry: 0,
            Maths: 0
        });
        this.totalStudyMinutes = this.getData('totalStudyMinutes', 0);
        this.dailyStudyTimes = this.getData('dailyStudyTimes', {});
        this.sessionHistory = this.getData('sessionHistory', {});
        this.studySession = this.getData('studySession', {
            originalStartTime: null,
            startTime: null,
            pausedTime: 0,
            isActive: false,
            isPaused: false
        });
        
        this.dataLoaded = true;
        this.updateUI();
        this.loadAllChapters();
    }
    
    // Helper method to load all chapters after data is ready
    loadAllChapters() {
        this.loadChapters('physics', this.currentGrade.physics);
        this.loadChapters('chemistry', this.currentGrade.chemistry);
        this.loadChapters('maths', this.currentGrade.maths);
    }

    initializeDefaultData() {
        this.completedChapters = {
            Physics: [],
            Chemistry: [],
            Maths: []
        };
        this.mcqCounts = {
            Physics: 0,
            Chemistry: 0,
            Maths: 0
        };
        this.totalStudyMinutes = 0;
        this.dailyStudyTimes = {};
        this.sessionHistory = {};
        this.studySession = {
            originalStartTime: null,
            startTime: null,
            pausedTime: 0,
            isActive: false,
            isPaused: false
        };
    }

    // Load all data (handled by auth state change)
    loadData() {
        // This method is now handled by initFirebaseAuth
        // Data is loaded based on authentication state
        if (!this.dataLoaded) {
            this.loadDataFromLocalStorage();
        }
    }

    // Save data (prioritize Firestore, fallback to localStorage)
    saveData() {
        if (this.currentUser) {
            this.saveDataToFirestore();
        } else {
            // Fallback to localStorage when not authenticated
            this.setData('completedChapters', this.completedChapters);
            this.setData('mcqCounts', this.mcqCounts);
            this.setData('totalStudyMinutes', this.totalStudyMinutes);
            this.setData('dailyStudyTimes', this.dailyStudyTimes);
            this.setData('sessionHistory', this.sessionHistory);
            this.setData('studySession', this.studySession);
        }
    }

    // Authentication Modal Management
    showAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.add('open');
            this.clearAuthError();
        } else {
            console.warn('Auth modal not found');
        }
    }

    hideAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('open');
            this.clearAuthError();
        }
    }

    toggleAuthMode() {
        this.isSignUpMode = !this.isSignUpMode;
        const title = document.getElementById('authTitle');
        const submitBtn = document.getElementById('authSubmit');
        const toggleBtn = document.getElementById('authToggle');
        
        if (this.isSignUpMode) {
            title.textContent = 'Sign Up';
            submitBtn.textContent = 'Sign Up';
            toggleBtn.textContent = 'Already have an account? Sign In';
        } else {
            title.textContent = 'Sign In';
            submitBtn.textContent = 'Sign In';
            toggleBtn.textContent = "Don't have an account? Sign Up";
        }
        
        this.clearAuthError();
    }

    // Data Import functionality
    setupImportListeners() {
        // Import button in drawer
        const importDataBtn = document.getElementById('importDataBtn');
        if (importDataBtn) {
            importDataBtn.addEventListener('click', () => {
                this.showImportModal();
            });
        }

        // Close import modal
        const closeImport = document.getElementById('closeImport');
        if (closeImport) {
            closeImport.addEventListener('click', () => {
                this.hideImportModal();
            });
        }

        // File input change
        const backupFileInput = document.getElementById('backupFileInput');
        if (backupFileInput) {
            backupFileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e);
            });
        }

        // Confirm import button
        const confirmImport = document.getElementById('confirmImport');
        if (confirmImport) {
            confirmImport.addEventListener('click', () => {
                this.performImport();
            });
        }

        // Import mode change
        document.addEventListener('change', (e) => {
            if (e.target.name === 'importMode') {
                this.updateImportPreview();
                this.updateImportButton();
            }
        });
    }

    showImportModal() {
        // Require authentication
        if (!this.currentUser) {
            this.showToast('Please sign in to import data');
            this.showAuthModal();
            return;
        }

        const modal = document.getElementById('importModal');
        if (modal) {
            modal.classList.add('open');
            this.resetImportModal();
        }
    }

    hideImportModal() {
        const modal = document.getElementById('importModal');
        if (modal) {
            modal.classList.remove('open');
            this.resetImportModal();
        }
    }

    resetImportModal() {
        const fileInput = document.getElementById('backupFileInput');
        const preview = document.getElementById('importPreview');
        const confirmBtn = document.getElementById('confirmImport');
        const status = document.getElementById('importStatus');

        if (fileInput) fileInput.value = '';
        if (preview) preview.style.display = 'none';
        if (confirmBtn) confirmBtn.style.display = 'none';
        if (status) {
            status.style.display = 'none';
            status.innerHTML = '';
        }

        this.pendingImportData = null;
    }

    handleFileSelection(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size (max 1MB)
        const maxSize = 1024 * 1024; // 1MB
        if (file.size > maxSize) {
            this.showImportError('File is too large. Maximum size is 1MB.');
            return;
        }

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.txt')) {
            this.showImportError('Please select a .txt backup file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            try {
                const parsedData = this.parseBackupFile(content);
                this.showImportPreview(parsedData);
                this.pendingImportData = parsedData;
            } catch (error) {
                console.error('Parse error:', error);
                this.showImportError('Error parsing backup file: ' + error.message);
            }
        };
        reader.onerror = () => {
            this.showImportError('Error reading file. Please try again.');
        };
        reader.readAsText(file);
    }

    parseBackupFile(content) {
        const lines = content.trim().split('\n');
        const data = {
            timestamp: null,
            completedChapters: { Physics: [], Chemistry: [], Maths: [] },
            mcqCounts: { Physics: 0, Chemistry: 0, Maths: 0 },
            totalStudyMinutes: 0,
            dailyStudyTimes: {},
            sessionHistory: {}
        };

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (trimmedLine.startsWith('Timestamp:')) {
                data.timestamp = trimmedLine.substring('Timestamp:'.length).trim();
            } else if (trimmedLine.startsWith('Physics MCQs:')) {
                data.mcqCounts.Physics = parseInt(trimmedLine.substring('Physics MCQs:'.length).trim()) || 0;
            } else if (trimmedLine.startsWith('Chemistry MCQs:')) {
                data.mcqCounts.Chemistry = parseInt(trimmedLine.substring('Chemistry MCQs:'.length).trim()) || 0;
            } else if (trimmedLine.startsWith('Maths MCQs:')) {
                data.mcqCounts.Maths = parseInt(trimmedLine.substring('Maths MCQs:'.length).trim()) || 0;
            } else if (trimmedLine.startsWith('Total Study Minutes:')) {
                data.totalStudyMinutes = parseInt(trimmedLine.substring('Total Study Minutes:'.length).trim()) || 0;
            } else if (trimmedLine.startsWith('PhysicsChapters:')) {
                const chaptersStr = trimmedLine.substring('PhysicsChapters:'.length).trim();
                data.completedChapters.Physics = chaptersStr ? chaptersStr.split(',').map(ch => ch.trim()) : [];
            } else if (trimmedLine.startsWith('ChemistryChapters:')) {
                const chaptersStr = trimmedLine.substring('ChemistryChapters:'.length).trim();
                data.completedChapters.Chemistry = chaptersStr ? chaptersStr.split(',').map(ch => ch.trim()) : [];
            } else if (trimmedLine.startsWith('MathsChapters:')) {
                const chaptersStr = trimmedLine.substring('MathsChapters:'.length).trim();
                data.completedChapters.Maths = chaptersStr ? chaptersStr.split(',').map(ch => ch.trim()) : [];
            } else if (trimmedLine.startsWith('StudyHistory:')) {
                const historyStr = trimmedLine.substring('StudyHistory:'.length).trim();
                const parts = historyStr.split(':');
                if (parts.length === 2) {
                    const date = parts[0];
                    const minutes = parseInt(parts[1]) || 0;
                    data.dailyStudyTimes[date] = minutes;
                    data.sessionHistory[date] = [{
                        startTime: new Date(date + ' 00:00:00').toISOString(),
                        endTime: new Date(date + ' 00:00:00').toISOString(),
                        duration: minutes,
                        imported: true
                    }];
                }
            }
        }

        return data;
    }

    showImportPreview(data) {
        const preview = document.getElementById('importPreview');
        const confirmBtn = document.getElementById('confirmImport');

        if (!preview || !confirmBtn) return;

        this.updateImportPreview();
        this.updateImportButton();
        preview.style.display = 'block';
        confirmBtn.style.display = 'block';
    }

    updateImportPreview() {
        if (!this.pendingImportData) return;

        const previewContent = document.getElementById('importPreviewContent');
        if (!previewContent) return;

        const importMode = document.querySelector('input[name="importMode"]:checked')?.value || 'merge';
        const data = this.pendingImportData;

        let previewText = '';
        
        // Basic backup info
        previewText += `Backup from: ${data.timestamp || 'Unknown date'}\n`;
        previewText += `Total Study Minutes: ${data.totalStudyMinutes} (${Math.floor(data.totalStudyMinutes / 60)}h ${data.totalStudyMinutes % 60}m)\n`;
        previewText += `MCQs: Physics: ${data.mcqCounts.Physics}, Chemistry: ${data.mcqCounts.Chemistry}, Maths: ${data.mcqCounts.Maths}\n`;
        
        previewText += `Completed Chapters:\n`;
        previewText += `• Physics: ${data.completedChapters.Physics.length ? data.completedChapters.Physics.join(', ') : 'None'}\n`;
        previewText += `• Chemistry: ${data.completedChapters.Chemistry.length ? data.completedChapters.Chemistry.join(', ') : 'None'}\n`;
        previewText += `• Maths: ${data.completedChapters.Maths.length ? data.completedChapters.Maths.join(', ') : 'None'}\n`;
        previewText += `Study History: ${Object.keys(data.dailyStudyTimes).length} days of records\n\n`;

        // Mode-specific preview
        if (importMode === 'merge') {
            previewText += `MERGE MODE - What will happen:\n`;
            previewText += `• MCQ counts will be ADDED to your current counts\n`;
            previewText += `• Study minutes will be ADDED to your total time\n`;
            previewText += `• New completed chapters will be ADDED (no duplicates)\n`;
            previewText += `• Study history from new dates will be ADDED\n`;
            previewText += `• Your existing data will be PRESERVED`;
        } else {
            previewText += `REPLACE MODE - What will happen:\n`;
            previewText += `• Your current MCQ counts will be REPLACED with backup counts\n`;
            previewText += `• Your current study minutes will be REPLACED with backup total\n`;
            previewText += `• Your completed chapters will be REPLACED with backup chapters\n`;
            previewText += `• Your study history will be REPLACED with backup history\n`;
            previewText += `• ⚠️ ALL YOUR CURRENT DATA WILL BE LOST`;
        }

        previewContent.textContent = previewText;
    }

    updateImportButton() {
        const confirmBtn = document.getElementById('confirmImport');
        if (!confirmBtn) return;

        const importMode = document.querySelector('input[name="importMode"]:checked')?.value || 'merge';
        if (importMode === 'replace') {
            confirmBtn.textContent = 'Replace My Data';
        } else {
            confirmBtn.textContent = 'Merge Data';
        }
    }

    async performImport() {
        if (!this.pendingImportData) {
            this.showImportError('No data to import');
            return;
        }

        // Double-check authentication
        if (!this.currentUser) {
            this.showImportError('Please sign in to import data');
            return;
        }

        try {
            this.showImportStatus('Importing data...', 'info');

            // Validate the data structure before merging
            if (!this.validateImportData(this.pendingImportData)) {
                this.showImportError('Invalid data format in backup file');
                return;
            }

            // Get import mode and merge or replace data accordingly
            const importMode = document.querySelector('input[name="importMode"]:checked')?.value || 'merge';
            if (importMode === 'replace') {
                this.replaceWithImportedData(this.pendingImportData);
            } else {
                this.mergeImportedData(this.pendingImportData);
            }

            // Save the updated data to Firebase
            await this.saveDataToFirestore();

            // Update UI
            this.updateUI();
            this.loadAllChapters();

            this.showImportStatus('Data imported successfully!', 'success');
            this.showToast('Backup data imported successfully');

            setTimeout(() => {
                this.hideImportModal();
            }, 2000);

        } catch (error) {
            console.error('Error importing data:', error);
            this.showImportError('Failed to import data: ' + error.message);
        }
    }

    validateImportData(data) {
        // Validate required structure
        if (!data || typeof data !== 'object') return false;
        
        // Validate completedChapters structure
        if (!data.completedChapters || typeof data.completedChapters !== 'object') return false;
        const requiredSubjects = ['Physics', 'Chemistry', 'Maths'];
        for (const subject of requiredSubjects) {
            if (!Array.isArray(data.completedChapters[subject])) return false;
        }
        
        // Validate mcqCounts structure
        if (!data.mcqCounts || typeof data.mcqCounts !== 'object') return false;
        for (const subject of requiredSubjects) {
            if (typeof data.mcqCounts[subject] !== 'number' || data.mcqCounts[subject] < 0) return false;
        }
        
        // Validate totalStudyMinutes
        if (typeof data.totalStudyMinutes !== 'number' || data.totalStudyMinutes < 0) return false;
        
        // Validate dailyStudyTimes
        if (!data.dailyStudyTimes || typeof data.dailyStudyTimes !== 'object') return false;
        
        // Validate sessionHistory
        if (!data.sessionHistory || typeof data.sessionHistory !== 'object') return false;
        
        return true;
    }

    mergeImportedData(importedData) {
        // Safely merge MCQ counts (add to existing counts)
        this.mcqCounts.Physics = (this.mcqCounts.Physics || 0) + importedData.mcqCounts.Physics;
        this.mcqCounts.Chemistry = (this.mcqCounts.Chemistry || 0) + importedData.mcqCounts.Chemistry;
        this.mcqCounts.Maths = (this.mcqCounts.Maths || 0) + importedData.mcqCounts.Maths;

        // Merge completed chapters (avoid duplicates, validate against known chapters)
        ['Physics', 'Chemistry', 'Maths'].forEach(subject => {
            if (!this.completedChapters[subject]) {
                this.completedChapters[subject] = [];
            }
            
            const existingChapters = new Set(this.completedChapters[subject]);
            const validChapters = this.getValidChaptersForSubject(subject);
            
            importedData.completedChapters[subject].forEach(chapter => {
                // Only add if not already completed and is a valid chapter
                if (!existingChapters.has(chapter) && validChapters.includes(chapter)) {
                    this.completedChapters[subject].push(chapter);
                }
            });
        });

        // Add to total study minutes
        this.totalStudyMinutes = (this.totalStudyMinutes || 0) + importedData.totalStudyMinutes;

        // Merge daily study times (preserve existing, add new dates)
        Object.keys(importedData.dailyStudyTimes).forEach(date => {
            if (!this.dailyStudyTimes[date]) {
                this.dailyStudyTimes[date] = importedData.dailyStudyTimes[date];
            }
            // If date already exists, keep existing value to avoid double-counting
        });

        // Merge session history (preserve existing, add new dates)
        Object.keys(importedData.sessionHistory).forEach(date => {
            if (!this.sessionHistory[date]) {
                this.sessionHistory[date] = importedData.sessionHistory[date];
            }
            // If date already exists, keep existing sessions to avoid duplicates
        });
    }

    getValidChaptersForSubject(subject) {
        // Get all valid chapters for a subject from CHAPTERS constant
        if (!window.CHAPTERS || !window.CHAPTERS[subject]) {
            return CHAPTERS[subject] ? [...CHAPTERS[subject]['12th'], ...CHAPTERS[subject]['11th']] : [];
        }
        const chapters12th = CHAPTERS[subject]['12th'] || [];
        const chapters11th = CHAPTERS[subject]['11th'] || [];
        return [...chapters12th, ...chapters11th];
    }

    replaceWithImportedData(importedData) {
        // Replace all data with imported data
        this.mcqCounts = {
            Physics: importedData.mcqCounts.Physics,
            Chemistry: importedData.mcqCounts.Chemistry,
            Maths: importedData.mcqCounts.Maths
        };

        // Replace completed chapters
        this.completedChapters = {
            Physics: [...importedData.completedChapters.Physics],
            Chemistry: [...importedData.completedChapters.Chemistry],
            Maths: [...importedData.completedChapters.Maths]
        };

        // Replace total study minutes
        this.totalStudyMinutes = importedData.totalStudyMinutes;

        // Replace daily study times
        this.dailyStudyTimes = { ...importedData.dailyStudyTimes };

        // Replace session history
        this.sessionHistory = { ...importedData.sessionHistory };

        // Reset current study session
        this.studySession = {
            originalStartTime: null,
            startTime: null,
            pausedTime: 0,
            isActive: false,
            isPaused: false
        };
    }

    showImportStatus(message, type) {
        const status = document.getElementById('importStatus');
        if (status) {
            status.textContent = message;
            status.className = 'import-status ' + type;
            status.style.display = 'block';
        }
    }

    showImportError(message) {
        this.showImportStatus(message, 'error');
    }

    // Settings System
    setupSettingsListeners() {
        // Theme selection
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                this.changeTheme(theme);
                this.updateThemeSelection(theme);
            });
        });

        // Font size slider
        const fontSizeSlider = document.getElementById('fontSizeSlider');
        const fontSizeValue = document.getElementById('fontSizeValue');
        if (fontSizeSlider && fontSizeValue) {
            fontSizeSlider.addEventListener('input', (e) => {
                const size = e.target.value;
                fontSizeValue.textContent = size + 'px';
                this.changeFontSize(size);
            });
        }

        // Study goal slider
        const studyGoalSlider = document.getElementById('studyGoalSlider');
        const studyGoalValue = document.getElementById('studyGoalValue');
        if (studyGoalSlider && studyGoalValue) {
            studyGoalSlider.addEventListener('input', (e) => {
                const minutes = parseInt(e.target.value);
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                studyGoalValue.textContent = `${hours}h ${mins}m`;
                this.saveSettingValue('studyGoal', minutes);
            });
        }

        // Animation speed radios
        const animationRadios = document.querySelectorAll('input[name="animationSpeed"]');
        animationRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.changeAnimationSpeed(radio.value);
                }
            });
        });

        // Toggle options
        const toggles = {
            'reducedMotion': () => this.toggleReducedMotion(),
            'highContrast': () => this.toggleHighContrast(),
            'compactMode': () => this.toggleCompactMode(),
            'studyReminders': () => this.saveSettingValue('studyReminders', document.getElementById('studyReminders').checked),
            'progressNotifications': () => this.saveSettingValue('progressNotifications', document.getElementById('progressNotifications').checked),
            'autoSaveProgress': () => this.saveSettingValue('autoSaveProgress', document.getElementById('autoSaveProgress').checked)
        };

        Object.keys(toggles).forEach(toggleId => {
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                toggle.addEventListener('change', toggles[toggleId]);
            }
        });

        // Default subject selector
        const defaultSubject = document.getElementById('defaultSubject');
        if (defaultSubject) {
            defaultSubject.addEventListener('change', (e) => {
                this.saveSettingValue('defaultSubject', e.target.value);
            });
        }

        // Action buttons
        const exportData = document.getElementById('exportData');
        if (exportData) {
            exportData.addEventListener('click', () => this.exportProgressData());
        }

        const resetSettings = document.getElementById('resetSettings');
        if (resetSettings) {
            resetSettings.addEventListener('click', () => this.resetSettings());
        }

        const resetAllData = document.getElementById('resetAllData');
        if (resetAllData) {
            resetAllData.addEventListener('click', () => this.resetAllData());
        }
    }

    loadSettings() {
        const savedSettings = this.getData('appSettings', {
            theme: 'default',
            fontSize: 16,
            animationSpeed: 'normal',
            reducedMotion: false,
            highContrast: false,
            compactMode: false,
            studyGoal: 120,
            defaultSubject: '',
            studyReminders: false,
            progressNotifications: true,
            autoSaveProgress: true
        });

        // Apply theme
        this.changeTheme(savedSettings.theme);
        this.updateThemeSelection(savedSettings.theme);

        // Apply font size
        this.changeFontSize(savedSettings.fontSize);
        const fontSizeSlider = document.getElementById('fontSizeSlider');
        const fontSizeValue = document.getElementById('fontSizeValue');
        if (fontSizeSlider && fontSizeValue) {
            fontSizeSlider.value = savedSettings.fontSize;
            fontSizeValue.textContent = savedSettings.fontSize + 'px';
        }

        // Apply animation speed
        this.changeAnimationSpeed(savedSettings.animationSpeed);
        const animationRadio = document.querySelector(`input[name="animationSpeed"][value="${savedSettings.animationSpeed}"]`);
        if (animationRadio) animationRadio.checked = true;

        // Apply toggles
        const toggleSettings = {
            'reducedMotion': savedSettings.reducedMotion,
            'highContrast': savedSettings.highContrast,
            'compactMode': savedSettings.compactMode,
            'studyReminders': savedSettings.studyReminders,
            'progressNotifications': savedSettings.progressNotifications,
            'autoSaveProgress': savedSettings.autoSaveProgress
        };

        Object.keys(toggleSettings).forEach(toggleId => {
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                toggle.checked = toggleSettings[toggleId];
                // Apply the effect if needed
                if (toggleId === 'reducedMotion' && toggleSettings[toggleId]) this.toggleReducedMotion(true);
                if (toggleId === 'highContrast' && toggleSettings[toggleId]) this.toggleHighContrast(true);
                if (toggleId === 'compactMode' && toggleSettings[toggleId]) this.toggleCompactMode(true);
            }
        });

        // Apply study goal
        const studyGoalSlider = document.getElementById('studyGoalSlider');
        const studyGoalValue = document.getElementById('studyGoalValue');
        if (studyGoalSlider && studyGoalValue) {
            studyGoalSlider.value = savedSettings.studyGoal;
            const hours = Math.floor(savedSettings.studyGoal / 60);
            const mins = savedSettings.studyGoal % 60;
            studyGoalValue.textContent = `${hours}h ${mins}m`;
        }

        // Apply default subject
        const defaultSubject = document.getElementById('defaultSubject');
        if (defaultSubject) {
            defaultSubject.value = savedSettings.defaultSubject;
        }
    }

    changeTheme(themeName) {
        const validThemes = ['default', 'dark', 'ocean', 'forest', 'sunset', 'minimal'];
        const selectedTheme = validThemes.includes(themeName) ? themeName : 'default';
        
        // Set the data-theme attribute which triggers CSS variable overrides
        document.documentElement.dataset.theme = selectedTheme;
        
        // Save theme preference
        this.saveSettingValue('theme', selectedTheme);
    }

    updateThemeSelection(themeName) {
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.classList.remove('active');
            if (option.dataset.theme === themeName) {
                option.classList.add('active');
            }
        });
    }

    changeFontSize(size) {
        document.documentElement.style.setProperty('--base-font-size', size + 'px');
        this.saveSettingValue('fontSize', parseInt(size));
    }

    changeAnimationSpeed(speed) {
        const speeds = {
            'slow': { '--transition-fast': '0.3s ease', '--transition-normal': '0.6s ease', '--transition-slow': '1s ease' },
            'normal': { '--transition-fast': '0.15s ease', '--transition-normal': '0.3s ease', '--transition-slow': '0.5s ease' },
            'fast': { '--transition-fast': '0.08s ease', '--transition-normal': '0.15s ease', '--transition-slow': '0.25s ease' }
        };

        const speedValues = speeds[speed] || speeds['normal'];
        const root = document.documentElement;
        Object.keys(speedValues).forEach(property => {
            root.style.setProperty(property, speedValues[property]);
        });

        this.saveSettingValue('animationSpeed', speed);
    }

    toggleReducedMotion(forceValue = null) {
        const isActive = forceValue !== null ? forceValue : document.getElementById('reducedMotion').checked;
        if (isActive) {
            document.documentElement.style.setProperty('--transition-fast', '0s');
            document.documentElement.style.setProperty('--transition-normal', '0s');
            document.documentElement.style.setProperty('--transition-slow', '0s');
            document.body.classList.add('reduced-motion');
        } else {
            this.changeAnimationSpeed(this.getData('appSettings', {}).animationSpeed || 'normal');
            document.body.classList.remove('reduced-motion');
        }
        this.saveSettingValue('reducedMotion', isActive);
    }

    toggleHighContrast(forceValue = null) {
        const isActive = forceValue !== null ? forceValue : document.getElementById('highContrast').checked;
        document.body.classList.toggle('high-contrast', isActive);
        this.saveSettingValue('highContrast', isActive);
    }

    toggleCompactMode(forceValue = null) {
        const isActive = forceValue !== null ? forceValue : document.getElementById('compactMode').checked;
        document.body.classList.toggle('compact-mode', isActive);
        this.saveSettingValue('compactMode', isActive);
    }

    saveSettingValue(key, value) {
        const currentSettings = this.getData('appSettings', {});
        currentSettings[key] = value;
        this.setData('appSettings', currentSettings);
    }

    exportProgressData() {
        const exportData = {
            timestamp: new Date().toISOString(),
            completedChapters: this.completedChapters,
            mcqCounts: this.mcqCounts,
            totalStudyMinutes: this.totalStudyMinutes,
            dailyStudyTimes: this.dailyStudyTimes,
            sessionHistory: this.sessionHistory,
            settings: this.getData('appSettings', {})
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `mht-cet-progress-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Progress data exported successfully!');
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default? This will not affect your study progress.')) {
            localStorage.removeItem('appSettings');
            this.showToast('Settings reset successfully!');
            setTimeout(() => location.reload(), 1000);
        }
    }

    resetAllData() {
        if (confirm('⚠️ WARNING: This will permanently delete ALL your study progress and settings. This cannot be undone. Are you absolutely sure?')) {
            if (confirm('Last chance! This will delete everything including your completed chapters, MCQ counts, and study history. Type "DELETE" if you want to proceed:') && prompt('Type "DELETE" to confirm:') === 'DELETE') {
                // Clear all local storage
                localStorage.clear();
                
                // Clear Firebase data if user is authenticated
                if (this.currentUser) {
                    this.initializeDefaultData();
                    this.saveDataToFirestore();
                }
                
                this.showToast('All data has been reset.');
                setTimeout(() => location.reload(), 2000);
            }
        }
    }

    // Authentication Methods
    async handleAuthSubmit() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            this.showAuthError('Please fill in all fields');
            return;
        }
        
        if (password.length < 6) {
            this.showAuthError('Password must be at least 6 characters');
            return;
        }
        
        try {
            const submitBtn = document.getElementById('authSubmit');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
            
            if (this.isSignUpMode) {
                await this.signUp(email, password);
            } else {
                await this.signIn(email, password);
            }
            
            this.hideAuthModal();
            this.clearAuthForm();
        } catch (error) {
            this.showAuthError(this.getAuthErrorMessage(error));
        } finally {
            const submitBtn = document.getElementById('authSubmit');
            submitBtn.disabled = false;
            submitBtn.textContent = this.isSignUpMode ? 'Sign Up' : 'Sign In';
        }
    }

    async signUp(email, password) {
        const { createUserWithEmailAndPassword } = window.firebaseAuthFunctions;
        await createUserWithEmailAndPassword(window.firebaseAuth, email, password);
        this.showToast('Account created successfully!');
    }

    async signIn(email, password) {
        const { signInWithEmailAndPassword } = window.firebaseAuthFunctions;
        await signInWithEmailAndPassword(window.firebaseAuth, email, password);
        this.showToast('Signed in successfully!');
    }

    async signOut() {
        try {
            const { signOut } = window.firebaseAuthFunctions;
            await signOut(window.firebaseAuth);
            this.showToast('Signed out successfully');
        } catch (error) {
            console.error('Sign out error:', error);
            this.showToast('Error signing out');
        }
    }

    // Authentication UI Helpers
    showAuthError(message) {
        const errorDiv = document.getElementById('authError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        } else {
            console.error('Auth error:', message);
        }
    }

    clearAuthError() {
        const errorDiv = document.getElementById('authError');
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
    }

    clearAuthForm() {
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
    }

    getAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found':
                return 'No account found with this email address';
            case 'auth/wrong-password':
                return 'Incorrect password';
            case 'auth/email-already-in-use':
                return 'An account with this email already exists';
            case 'auth/weak-password':
                return 'Password is too weak';
            case 'auth/invalid-email':
                return 'Invalid email address';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later';
            default:
                return 'Authentication failed. Please try again';
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Menu toggle
        document.getElementById('menuButton').addEventListener('click', () => {
            this.toggleDrawer();
        });

        // Drawer overlay
        document.getElementById('drawerOverlay').addEventListener('click', () => {
            this.closeDrawer();
        });

        // History button
        document.getElementById('historyButton').addEventListener('click', () => {
            this.showHistory();
            this.closeDrawer();
        });

        // Settings button
        document.getElementById('settingsButton').addEventListener('click', () => {
            this.showSettings();
            this.closeDrawer();
        });

        // Close history modal
        document.getElementById('closeHistory').addEventListener('click', () => {
            this.closeHistory();
        });

        // Close settings modal
        document.getElementById('closeSettings').addEventListener('click', () => {
            this.closeSettings();
        });

        // Grade buttons for each subject
        this.setupGradeButtons();

        // MCQ controls
        this.setupMCQControls();

        // Stopwatch controls
        this.setupStopwatchControls();

        // Study time controls
        this.setupStudyTimeControls();
        
        // Swipe functionality
        this.setupSwipeListeners();
    }

    setupGradeButtons() {
        ['physics', 'chemistry', 'maths'].forEach(subject => {
            const page = document.getElementById(`${subject}-page`);
            const buttons = page.querySelectorAll('.grade-btn');
            
            buttons.forEach(btn => {
                btn.addEventListener('click', () => {
                    buttons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const grade = btn.dataset.grade;
                    this.currentGrade[subject] = grade;
                    this.loadChapters(subject, grade);
                });
            });
        });
    }

    setupMCQControls() {
        const subjectSelect = document.getElementById('subjectSelect');
        const mcqCountDisplay = document.getElementById('mcqCount');
        const increaseBtn = document.getElementById('increaseMCQ');
        const decreaseBtn = document.getElementById('decreaseMCQ');
        const saveBtn = document.getElementById('saveMCQ');

        subjectSelect.addEventListener('change', (e) => {
            this.selectedSubject = e.target.value;
            this.mcqCount = 0;
            mcqCountDisplay.textContent = '0';
        });

        increaseBtn.addEventListener('click', () => {
            this.mcqCount++;
            mcqCountDisplay.textContent = this.mcqCount;
        });

        decreaseBtn.addEventListener('click', () => {
            if (this.mcqCount > 0) {
                this.mcqCount--;
                mcqCountDisplay.textContent = this.mcqCount;
            }
        });

        saveBtn.addEventListener('click', () => {
            if (this.mcqCount > 0) {
                this.mcqCounts[this.selectedSubject] += this.mcqCount;
                this.saveData();
                this.updateProgressUI();
                this.showToast(`Saved ${this.mcqCount} MCQs for ${this.selectedSubject}`);
                this.mcqCount = 0;
                mcqCountDisplay.textContent = '0';
            } else {
                this.showToast('Please set MCQ count first');
            }
        });
    }

    setupStopwatchControls() {
        const startBtn = document.getElementById('startStopwatch');
        const pauseBtn = document.getElementById('pauseStopwatch');
        const resetBtn = document.getElementById('resetStopwatch');

        startBtn.addEventListener('click', () => {
            this.startStopwatch();
        });

        pauseBtn.addEventListener('click', () => {
            this.pauseStopwatch();
        });

        resetBtn.addEventListener('click', () => {
            this.resetStopwatch();
        });
    }

    setupStudyTimeControls() {
        const toggleBtn = document.getElementById('toggleSession');
        const pauseBtn = document.getElementById('togglePause');

        toggleBtn.addEventListener('click', () => {
            if (this.studySession.isActive) {
                this.endStudySession();
            } else {
                this.startStudySession();
            }
        });

        pauseBtn.addEventListener('click', () => {
            if (this.studySession.isPaused) {
                this.resumeStudySession();
            } else {
                this.pauseStudySession();
            }
        });
    }

    // Swipe functionality setup
    setupSwipeListeners() {
        const viewpager = document.getElementById('viewpager');
        
        viewpager.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            this.isScrolling = false;
        });
        
        viewpager.addEventListener('touchmove', (e) => {
            if (!this.touchStartX || !this.touchStartY) return;
            
            const touchCurrentX = e.touches[0].clientX;
            const touchCurrentY = e.touches[0].clientY;
            
            const diffX = this.touchStartX - touchCurrentX;
            const diffY = this.touchStartY - touchCurrentY;
            
            if (!this.isScrolling) {
                if (Math.abs(diffX) > Math.abs(diffY)) {
                    // Horizontal swipe detected
                    e.preventDefault();
                    this.isScrolling = true;
                } else {
                    // Vertical scroll, let it happen naturally
                    return;
                }
            }
        });
        
        viewpager.addEventListener('touchend', (e) => {
            if (!this.touchStartX || !this.isScrolling) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const diffX = this.touchStartX - touchEndX;
            
            if (Math.abs(diffX) > 50) { // Minimum swipe distance
                if (diffX > 0) {
                    // Swipe left - next page
                    this.nextPage();
                } else {
                    // Swipe right - previous page
                    this.previousPage();
                }
            }
            
            this.touchStartX = 0;
            this.touchStartY = 0;
            this.isScrolling = false;
        });
    }
    
    // View pager navigation methods
    nextPage() {
        if (this.currentPageIndex < this.tabNames.length - 1) {
            this.currentPageIndex++;
            this.moveViewPager();
        }
    }
    
    previousPage() {
        if (this.currentPageIndex > 0) {
            this.currentPageIndex--;
            this.moveViewPager();
        }
    }
    
    // Pure view pager movement without circular calls
    moveViewPager() {
        const viewpager = document.getElementById('viewpager');
        const translateX = -this.currentPageIndex * (100 / this.tabNames.length);
        viewpager.style.transform = `translateX(${translateX}%)`;
        
        // Update UI based on current page
        const tabName = this.tabNames[this.currentPageIndex];
        this.updateTabUI(tabName);
    }

    // Navigation for tab clicks
    switchTab(tabName) {
        // Update current page index
        const tabIndex = this.tabNames.indexOf(tabName);
        if (tabIndex !== -1) {
            this.currentPageIndex = tabIndex;
        }
        
        // Move viewpager to correct position
        const viewpager = document.getElementById('viewpager');
        const translateX = -this.currentPageIndex * (100 / this.tabNames.length);
        viewpager.style.transform = `translateX(${translateX}%)`;
        
        // Update UI
        this.updateTabUI(tabName);
    }
    
    updateTabUI(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        activeTab.classList.add('active');

        // Scroll active tab into view
        this.scrollTabIntoView(activeTab);

        // Update pages (keeping active class for styling)
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`${tabName}-page`).classList.add('active');

        // Update toolbar title
        const titles = {
            'progress': 'Progress',
            'physics': 'Physics',
            'chemistry': 'Chemistry',
            'maths': 'Maths',
            'mcq': 'MCQ Tracker',
            'stopwatch': 'Stopwatch',
            'study-time': 'Study Time',
        };
        document.getElementById('toolbarTitle').textContent = titles[tabName];

        this.currentTab = tabName;
    }
    
    // Scroll active tab into view on mobile
    scrollTabIntoView(activeTab) {
        const tabBar = document.querySelector('.tab-bar');
        
        if (!activeTab || !tabBar) return;
        
        // Get tab bar and active tab positions
        const tabBarRect = tabBar.getBoundingClientRect();
        const activeTabRect = activeTab.getBoundingClientRect();
        
        // Calculate scroll position needed
        const tabBarScrollLeft = tabBar.scrollLeft;
        const activeTabLeft = activeTabRect.left - tabBarRect.left + tabBarScrollLeft;
        const activeTabRight = activeTabLeft + activeTabRect.width;
        
        // Check if tab is already visible
        const visibleLeft = tabBarScrollLeft;
        const visibleRight = tabBarScrollLeft + tabBarRect.width;
        
        let newScrollLeft = tabBarScrollLeft;
        
        // If tab is to the right of visible area, scroll right
        if (activeTabRight > visibleRight) {
            newScrollLeft = activeTabRight - tabBarRect.width;
        }
        // If tab is to the left of visible area, scroll left
        else if (activeTabLeft < visibleLeft) {
            newScrollLeft = activeTabLeft;
        }
        
        // Smooth scroll to the new position
        if (newScrollLeft !== tabBarScrollLeft) {
            tabBar.scrollTo({
                left: newScrollLeft,
                behavior: 'smooth'
            });
        }
    }

    // Drawer Management
    toggleDrawer() {
        const drawer = document.getElementById('navigationDrawer');
        const overlay = document.getElementById('drawerOverlay');
        
        if (drawer.classList.contains('open')) {
            this.closeDrawer();
        } else {
            this.openDrawer();
        }
    }

    openDrawer() {
        const drawer = document.getElementById('navigationDrawer');
        const overlay = document.getElementById('drawerOverlay');
        const menuButton = document.getElementById('menuButton');
        
        drawer.classList.add('open');
        overlay.classList.add('open');
        menuButton.classList.add('open');
        this.updateTodayStudyTime();
    }

    closeDrawer() {
        const drawer = document.getElementById('navigationDrawer');
        const overlay = document.getElementById('drawerOverlay');
        const menuButton = document.getElementById('menuButton');
        
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        menuButton.classList.remove('open');
    }

    // Chapter Management
    loadChapters(subject, grade) {
        const container = document.getElementById(`${subject}Chapters`);
        const chapters = CHAPTERS[subject.charAt(0).toUpperCase() + subject.slice(1)][grade];
        
        // Safety check to ensure completedChapters is initialized
        if (!this.completedChapters) {
            console.warn('completedChapters not initialized yet');
            return;
        }
        
        container.innerHTML = '';
        
        chapters.forEach(chapter => {
            const subjectKey = subject.charAt(0).toUpperCase() + subject.slice(1);
            const isCompleted = this.completedChapters[subjectKey] && this.completedChapters[subjectKey].includes(chapter);
            
            const chapterDiv = document.createElement('div');
            chapterDiv.className = `chapter-item ${isCompleted ? 'completed' : ''}`;
            chapterDiv.innerHTML = `
                <div class="chapter-checkbox">${isCompleted ? '✓' : ''}</div>
                <span class="chapter-name">${chapter}</span>
            `;
            
            chapterDiv.addEventListener('click', () => {
                this.toggleChapter(subject.charAt(0).toUpperCase() + subject.slice(1), chapter);
            });
            
            container.appendChild(chapterDiv);
        });
    }

    toggleChapter(subject, chapter) {
        const completed = this.completedChapters[subject];
        const index = completed.indexOf(chapter);
        
        if (index > -1) {
            completed.splice(index, 1);
        } else {
            completed.push(chapter);
        }
        
        this.saveData();
        this.loadChapters(subject.toLowerCase(), this.currentGrade[subject.toLowerCase()]);
        this.updateProgressUI();
    }

    // Progress Updates
    updateUI() {
        this.updateProgressUI();
        this.updateTodayStudyTime();
        this.updateStudySessionUI();
        this.updateTodaySessionsUI();
    }

    updateProgressUI() {
        Object.keys(SUBJECTS).forEach(key => {
            const subject = SUBJECTS[key];
            const completed = this.completedChapters[subject].length;
            const total = TOTAL_CHAPTERS[subject];
            const percentage = Math.round((completed / total) * 100);
            const mcqs = this.mcqCounts[subject];
            
            // Update progress display
            document.getElementById(`${subject.toLowerCase()}Progress`).textContent = `${completed}/${total}`;
            document.getElementById(`${subject.toLowerCase()}Percent`).textContent = `${percentage}%`;
            document.getElementById(`${subject.toLowerCase()}MCQ`).textContent = mcqs;
            document.getElementById(`${subject.toLowerCase()}Bar`).style.width = `${percentage}%`;
        });

        // Update total study time
        const hours = Math.floor(this.totalStudyMinutes / 60);
        const minutes = this.totalStudyMinutes % 60;
        document.getElementById('totalStudyTime').textContent = `${hours} hr ${minutes} min`;
    }

    updateTodayStudyTime() {
        const today = this.getTodayKey();
        const todayMinutes = this.dailyStudyTimes[today] || 0;
        const hours = Math.floor(todayMinutes / 60);
        const minutes = todayMinutes % 60;
        document.getElementById('todayStudyTime').textContent = `${hours} hr ${minutes} min`;
    }

    updateTodaySessionsUI() {
        const sessionsList = document.getElementById('todaySessionsList');
        
        // Safety check - if sessionsList doesn't exist, return early
        if (!sessionsList) {
            return;
        }
        
        // Safety check - ensure sessionHistory is initialized
        if (!this.sessionHistory) {
            this.sessionHistory = {};
        }
        
        const today = this.getTodayKey();
        const todaySessions = this.sessionHistory[today] || [];
        
        if (todaySessions.length === 0) {
            sessionsList.innerHTML = '<p class="no-sessions">No sessions today</p>';
            return;
        }
        
        sessionsList.innerHTML = '';
        
        todaySessions.forEach((session, index) => {
            const startTime = new Date(session.startTime);
            const endTime = new Date(session.endTime);
            
            const sessionItem = document.createElement('div');
            sessionItem.className = 'session-item';
            
            const hours = Math.floor(session.duration / 60);
            const mins = session.duration % 60;
            
            sessionItem.innerHTML = `
                <div class="session-time">
                    ${startTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} - 
                    ${endTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                </div>
                <div class="session-duration">${hours}h ${mins}m</div>
            `;
            
            sessionsList.appendChild(sessionItem);
        });
    }

    // Date Utilities
    getTodayKey() {
        return new Date().toISOString().split('T')[0];
    }

    calculateDaysLeft() {
        // Calculate days until March 1st (MHT-CET date)
        const now = new Date();
        const currentYear = now.getFullYear();
        let examDate = new Date(currentYear + 1, 2, 1); // March 1st next year
        
        // If we're before March 1st this year, use this year's date
        const thisYearExam = new Date(currentYear, 2, 1);
        if (now < thisYearExam) {
            examDate = thisYearExam;
        }
        
        const diffTime = examDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        document.getElementById('daysLeft').textContent = diffDays;
    }

    // Stopwatch Functions
    startStopwatch() {
        this.isStopwatchRunning = true;
        this.stopwatchInterval = setInterval(() => {
            this.stopwatchTime++;
            this.updateStopwatchDisplay();
        }, 1000);
        
        document.getElementById('startStopwatch').disabled = true;
        document.getElementById('pauseStopwatch').disabled = false;
        document.getElementById('resetStopwatch').disabled = false;
    }

    pauseStopwatch() {
        this.isStopwatchRunning = false;
        clearInterval(this.stopwatchInterval);
        
        document.getElementById('startStopwatch').disabled = false;
        document.getElementById('pauseStopwatch').disabled = true;
    }

    resetStopwatch() {
        this.isStopwatchRunning = false;
        clearInterval(this.stopwatchInterval);
        this.stopwatchTime = 0;
        this.updateStopwatchDisplay();
        
        document.getElementById('startStopwatch').disabled = false;
        document.getElementById('pauseStopwatch').disabled = true;
        document.getElementById('resetStopwatch').disabled = true;
    }

    updateStopwatchDisplay() {
        const hours = Math.floor(this.stopwatchTime / 3600);
        const minutes = Math.floor((this.stopwatchTime % 3600) / 60);
        const seconds = this.stopwatchTime % 60;
        
        const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('stopwatchDisplay').textContent = display;
    }

    // Study Session Functions
    startStudySession() {
        const now = Date.now();
        this.studySession = {
            originalStartTime: now,
            startTime: now,
            pausedTime: 0,
            isActive: true,
            isPaused: false
        };
        
        this.saveData();
        this.updateStudySessionUI();
        this.startStudyTimer();
        this.showToast('Study session started');
    }

    pauseStudySession() {
        if (this.studySession.isActive && !this.studySession.isPaused) {
            this.studySession.pausedTime += Date.now() - this.studySession.startTime;
            this.studySession.isPaused = true;
            this.saveData();
            this.updateStudySessionUI();
            clearInterval(this.studyInterval);
            this.showToast('Session paused');
        }
    }

    resumeStudySession() {
        if (this.studySession.isActive && this.studySession.isPaused) {
            this.studySession.startTime = Date.now();
            this.studySession.isPaused = false;
            this.saveData();
            this.updateStudySessionUI();
            this.startStudyTimer();
            this.showToast('Session resumed');
        }
    }

    endStudySession() {
        if (this.studySession.isActive) {
            let totalTime = this.studySession.pausedTime;
            if (!this.studySession.isPaused) {
                totalTime += Date.now() - this.studySession.startTime;
            }
            
            const minutes = Math.floor(totalTime / (1000 * 60));
            const endTime = Date.now();
            
            if (minutes > 0) {
                // Store individual session in history
                const today = this.getTodayKey();
                if (!this.sessionHistory[today]) {
                    this.sessionHistory[today] = [];
                }
                this.sessionHistory[today].push({
                    startTime: this.studySession.originalStartTime,
                    endTime: endTime,
                    duration: minutes
                });
                
                if (confirm(`You studied for ${Math.floor(minutes / 60)}h ${minutes % 60}m. Add to total?`)) {
                    this.addStudyTime(minutes);
                }
            }
            
            this.studySession = {
                originalStartTime: null,
                startTime: null,
                pausedTime: 0,
                isActive: false,
                isPaused: false
            };
            
            this.saveData();
            this.updateStudySessionUI();
            this.updateTodaySessionsUI(); // Update today's sessions display
            clearInterval(this.studyInterval);
            this.showToast('Session ended');
        }
    }

    addStudyTime(minutes) {
        const today = this.getTodayKey();
        this.dailyStudyTimes[today] = (this.dailyStudyTimes[today] || 0) + minutes;
        this.totalStudyMinutes += minutes;
        this.saveData();
        this.updateUI();
    }

    startStudyTimer() {
        this.studyInterval = setInterval(() => {
            this.updateStudySessionUI();
        }, 1000);
    }

    updateStudySessionUI() {
        const sessionInfo = document.getElementById('sessionInfo');
        const elapsedTime = document.getElementById('elapsedTime');
        const toggleBtn = document.getElementById('toggleSession');
        const pauseBtn = document.getElementById('togglePause');
        
        if (this.studySession.isActive) {
            const startTime = new Date(this.studySession.startTime);
            sessionInfo.textContent = `Session started at: ${startTime.toLocaleTimeString()}`;
            
            let totalElapsed = this.studySession.pausedTime;
            if (!this.studySession.isPaused) {
                totalElapsed += Date.now() - this.studySession.startTime;
            }
            
            const hours = Math.floor(totalElapsed / (1000 * 60 * 60));
            const minutes = Math.floor((totalElapsed % (1000 * 60 * 60)) / (1000 * 60));
            elapsedTime.textContent = `Elapsed time: ${hours}h ${minutes}m`;
            
            toggleBtn.textContent = 'End Study Session';
            pauseBtn.style.display = 'block';
            pauseBtn.textContent = this.studySession.isPaused ? 'Resume' : 'Pause';
        } else {
            sessionInfo.textContent = 'No active session';
            elapsedTime.textContent = '';
            toggleBtn.textContent = 'Start Study';
            pauseBtn.style.display = 'none';
        }
    }

    // History Management
    showHistory() {
        const modal = document.getElementById('historyModal');
        const content = document.getElementById('historyContent');
        
        content.innerHTML = '';
        
        // Get all dates from first study date to today
        const dates = this.getAllDatesInRange();
        
        if (dates.length === 0) {
            content.innerHTML = '<p style="text-align: center; color: #666;">No study history available</p>';
        } else {
            dates.forEach(date => {
                const minutes = this.dailyStudyTimes[date] || 0;
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                
                const historyItem = document.createElement('div');
                historyItem.className = `history-item ${minutes === 0 ? 'no-study' : ''} clickable`;
                historyItem.innerHTML = `
                    <span class="history-date">${new Date(date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                    })}</span>
                    <span class="history-time">${hours} hr ${mins.toString().padStart(2, '0')} min</span>
                    <span class="click-hint">Click to view sessions</span>
                `;
                
                // Add click handler to show session details
                historyItem.addEventListener('click', () => {
                    this.showSessionDetails(date);
                });
                
                content.appendChild(historyItem);
            });
        }
        
        modal.classList.add('open');
    }

    closeHistory() {
        document.getElementById('historyModal').classList.remove('open');
    }
    
    showSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.add('open');
            // Re-setup settings listeners since elements are now available
            this.setupSettingsListeners();
            // Load current settings values
            this.loadSettings();
        }
    }
    
    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.remove('open');
        }
    }

    showSessionDetails(date) {
        const modal = document.getElementById('historyModal');
        const content = document.getElementById('historyContent');
        
        // Get sessions for the selected date
        const sessions = (this.sessionHistory && this.sessionHistory[date]) || [];
        const totalMinutes = this.dailyStudyTimes[date] || 0;
        
        const dateFormatted = new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        
        content.innerHTML = `
            <div class="session-details-header">
                <button class="back-btn" id="backToHistory">← Back to History</button>
                <h4>${dateFormatted}</h4>
                <p class="total-time">Total: ${hours}h ${mins}m</p>
            </div>
            <div class="session-details-list" id="sessionDetailsList">
                ${sessions.length === 0 
                    ? '<p class="no-sessions">No sessions recorded for this date</p>'
                    : sessions.map((session, index) => {
                        const startTime = new Date(session.startTime);
                        const endTime = new Date(session.endTime);
                        const sessionHours = Math.floor(session.duration / 60);
                        const sessionMins = session.duration % 60;
                        
                        return `
                            <div class="session-detail-item" data-session-index="${index}">
                                <div class="session-info">
                                    <div class="session-number">Session ${index + 1}</div>
                                    <div class="session-time-range">
                                        ${startTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} - 
                                        ${endTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                    </div>
                                    <div class="session-duration">${sessionHours}h ${sessionMins}m</div>
                                </div>
                                <div class="session-actions">
                                    <button class="edit-session-btn" data-session-index="${index}">Edit</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
            </div>
        `;
        
        // Add back button functionality
        document.getElementById('backToHistory').addEventListener('click', () => {
            this.showHistory();
        });
        
        // Add edit button functionality
        document.querySelectorAll('.edit-session-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sessionIndex = parseInt(e.target.dataset.sessionIndex);
                this.editSession(date, sessionIndex, sessions);
            });
        });
        
        modal.classList.add('open');
    }

    editSession(date, sessionIndex, sessions) {
        const session = sessions[sessionIndex];
        const sessionItem = document.querySelector(`.session-detail-item[data-session-index="${sessionIndex}"]`);
        
        if (!session || !sessionItem) return;
        
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        
        // Format times for input fields (HH:MM format)
        const formatTimeForInput = (date) => {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        };
        
        // Create edit form
        sessionItem.innerHTML = `
            <div class="session-edit-form">
                <div class="session-number">Session ${sessionIndex + 1} - Editing</div>
                <div class="edit-fields">
                    <div class="time-inputs">
                        <label>
                            Start Time:
                            <input type="time" class="start-time-input" value="${formatTimeForInput(startTime)}" />
                        </label>
                        <label>
                            End Time:
                            <input type="time" class="end-time-input" value="${formatTimeForInput(endTime)}" />
                        </label>
                        <label>
                            Duration (minutes):
                            <input type="number" class="duration-input" value="${session.duration}" min="1" max="1440" />
                        </label>
                    </div>
                    <div class="duration-display">
                        Calculated Duration: <span class="calculated-duration">${Math.floor(session.duration / 60)}h ${session.duration % 60}m</span>
                    </div>
                </div>
                <div class="edit-actions">
                    <button class="save-session-btn" data-date="${date}" data-session-index="${sessionIndex}">Save</button>
                    <button class="cancel-edit-btn" data-date="${date}" data-session-index="${sessionIndex}">Cancel</button>
                    <button class="delete-session-btn" data-date="${date}" data-session-index="${sessionIndex}">Delete</button>
                </div>
            </div>
        `;
        
        // Add event listeners for the edit form
        const startInput = sessionItem.querySelector('.start-time-input');
        const endInput = sessionItem.querySelector('.end-time-input');
        const durationInput = sessionItem.querySelector('.duration-input');
        const durationSpan = sessionItem.querySelector('.calculated-duration');
        
        // Update calculated duration display when times change
        const updateDuration = () => {
            const startVal = startInput.value;
            const endVal = endInput.value;
            
            if (startVal && endVal) {
                const [startHour, startMin] = startVal.split(':').map(Number);
                const [endHour, endMin] = endVal.split(':').map(Number);
                
                const startMinutes = startHour * 60 + startMin;
                let endMinutes = endHour * 60 + endMin;
                
                // Handle overnight sessions
                if (endMinutes <= startMinutes) {
                    endMinutes += 24 * 60; // Add 24 hours
                }
                
                const duration = endMinutes - startMinutes;
                durationInput.value = duration; // Update duration input
                const hours = Math.floor(duration / 60);
                const mins = duration % 60;
                
                durationSpan.textContent = `${hours}h ${mins}m`;
            }
        };
        
        // Update end time when duration changes
        const updateEndTimeFromDuration = () => {
            const startVal = startInput.value;
            const durationVal = parseInt(durationInput.value);
            
            if (startVal && durationVal && durationVal > 0) {
                const [startHour, startMin] = startVal.split(':').map(Number);
                const startMinutes = startHour * 60 + startMin;
                const endMinutes = startMinutes + durationVal;
                
                // Check if session goes into next day
                if (endMinutes >= 24 * 60) {
                    // Session crosses midnight - show warning
                    const nextDayMinutes = endMinutes - (24 * 60);
                    const endHour = Math.floor(nextDayMinutes / 60);
                    const endMin = nextDayMinutes % 60;
                    
                    const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
                    endInput.value = endTimeStr;
                    
                    durationSpan.textContent = `${Math.floor(durationVal / 60)}h ${durationVal % 60}m (ends next day)`;
                    durationSpan.style.color = '#ff9800'; // Orange warning
                } else {
                    // Normal same-day session
                    const endHour = Math.floor(endMinutes / 60);
                    const endMin = endMinutes % 60;
                    
                    const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
                    endInput.value = endTimeStr;
                    
                    // Update display
                    const hours = Math.floor(durationVal / 60);
                    const mins = durationVal % 60;
                    durationSpan.textContent = `${hours}h ${mins}m`;
                    durationSpan.style.color = '#3F51B5'; // Normal blue
                }
            }
        };
        
        startInput.addEventListener('change', updateDuration);
        endInput.addEventListener('change', updateDuration);
        durationInput.addEventListener('input', updateEndTimeFromDuration);
        
        // Add validation for duration input
        durationInput.addEventListener('input', () => {
            const value = parseInt(durationInput.value);
            if (value < 1) {
                durationInput.value = 1;
            } else if (value > 1440) { // Max 24 hours
                durationInput.value = 1440;
            }
        });
        
        // Save button
        sessionItem.querySelector('.save-session-btn').addEventListener('click', () => {
            this.saveSessionEdit(date, sessionIndex, startInput.value, endInput.value, parseInt(durationInput.value));
        });
        
        // Cancel button
        sessionItem.querySelector('.cancel-edit-btn').addEventListener('click', () => {
            this.showSessionDetails(date);
        });
        
        // Delete button
        sessionItem.querySelector('.delete-session-btn').addEventListener('click', () => {
            this.deleteSession(date, sessionIndex);
        });
    }

    saveSessionEdit(date, sessionIndex, startTimeStr, endTimeStr, durationMinutes = null) {
        if (!startTimeStr) {
            alert('Please enter a start time');
            return;
        }
        
        // Parse the start time
        const [startHour, startMin] = startTimeStr.split(':').map(Number);
        if (isNaN(startHour) || isNaN(startMin)) {
            alert('Invalid start time format');
            return;
        }
        
        // Create new Date objects for the session date
        const sessionDate = new Date(date);
        const startTime = new Date(sessionDate);
        startTime.setHours(startHour, startMin, 0, 0);
        
        let duration;
        let endTime;
        
        // Use provided duration if available, otherwise calculate from times
        if (durationMinutes && durationMinutes > 0) {
            // Validate duration range
            if (durationMinutes < 1 || durationMinutes > 1440) {
                alert('Duration must be between 1 and 1440 minutes (24 hours)');
                return;
            }
            
            duration = durationMinutes;
            endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + duration);
        } else {
            if (!endTimeStr) {
                alert('Please enter an end time or duration');
                return;
            }
            
            const [endHour, endMin] = endTimeStr.split(':').map(Number);
            if (isNaN(endHour) || isNaN(endMin)) {
                alert('Invalid end time format');
                return;
            }
            
            endTime = new Date(sessionDate);
            endTime.setHours(endHour, endMin, 0, 0);
            
            // Handle overnight sessions
            if (endTime <= startTime) {
                endTime.setDate(endTime.getDate() + 1);
            }
            
            // Calculate duration in minutes
            const durationMs = endTime.getTime() - startTime.getTime();
            duration = Math.floor(durationMs / (1000 * 60));
            
            if (duration <= 0) {
                alert('End time must be after start time');
                return;
            }
            
            if (duration > 1440) {
                alert('Session duration cannot exceed 24 hours');
                return;
            }
        }
        
        // Additional validation: Check for reasonable session duration
        if (duration < 1) {
            alert('Session must be at least 1 minute long');
            return;
        }
        
        // Check for overlaps with other sessions on the same date
        const existingSessions = this.sessionHistory[date] || [];
        const sessionStart = startTime.getTime();
        const sessionEnd = endTime.getTime();
        
        for (let i = 0; i < existingSessions.length; i++) {
            if (i === sessionIndex) continue; // Skip the session being edited
            
            const existingSession = existingSessions[i];
            const existingStart = new Date(existingSession.startTime).getTime();
            const existingEnd = new Date(existingSession.endTime).getTime();
            
            // Check for overlap: sessions overlap if one starts before the other ends
            if ((sessionStart < existingEnd && sessionEnd > existingStart)) {
                alert('This session overlaps with an existing session on the same date. Please adjust the times.');
                return;
            }
        }
        
        // Update the session
        const sessions = this.sessionHistory[date] || [];
        sessions[sessionIndex] = {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: duration
        };
        
        // Update session history
        this.sessionHistory[date] = sessions;
        
        // Recalculate daily total
        this.recalculateDailyTotal(date);
        
        // Save to storage
        this.saveData();
        
        // Show success message
        this.showToast('Session updated successfully');
        
        // Refresh the session details view
        this.showSessionDetails(date);
    }

    deleteSession(date, sessionIndex) {
        if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
            return;
        }
        
        // Remove the session
        const sessions = this.sessionHistory[date] || [];
        sessions.splice(sessionIndex, 1);
        
        // Update session history
        if (sessions.length === 0) {
            delete this.sessionHistory[date];
        } else {
            this.sessionHistory[date] = sessions;
        }
        
        // Recalculate daily total
        this.recalculateDailyTotal(date);
        
        // Save to storage
        this.saveData();
        
        // Show success message
        this.showToast('Session deleted successfully');
        
        // Refresh the session details view
        this.showSessionDetails(date);
    }

    recalculateDailyTotal(date) {
        const sessions = this.sessionHistory[date] || [];
        const totalMinutes = sessions.reduce((total, session) => total + session.duration, 0);
        
        // Keep the date in history even when totalMinutes is 0, so it shows with zero study time
        this.dailyStudyTimes[date] = totalMinutes;
        
        // Recalculate total study minutes from all days for data consistency
        this.totalStudyMinutes = Object.values(this.dailyStudyTimes).reduce((sum, minutes) => sum + minutes, 0);
    }

    getAllDatesInRange() {
        const dates = Object.keys(this.dailyStudyTimes);
        const today = this.getTodayKey();
        
        if (dates.length === 0) {
            return [today];
        }
        
        const firstDate = dates.sort()[0];
        const startDate = new Date(firstDate);
        const endDate = new Date(today);
        const allDates = [];
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            allDates.push(d.toISOString().split('T')[0]);
        }
        
        return allDates.reverse(); // Most recent first
    }

    // Utility Functions
    showToast(message) {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 1000;
            font-weight: 500;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new StudyApp();
});