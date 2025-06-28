// Crossword KDP Generator JavaScript
let currentPuzzles = [];
let currentBookData = null;

// Tab Management
function showTab(tabName, clickedButton = null) {
    console.log('showTab called with:', tabName, clickedButton);
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        console.log('Hiding tab:', tab.id);
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const targetTab = document.getElementById(tabName + '-tab');
    console.log('Target tab:', tabName + '-tab', targetTab);
    
    if (targetTab) {
        targetTab.classList.add('active');
        console.log('Activated tab:', targetTab.id);
    } else {
        console.error('Tab not found:', tabName + '-tab');
    }
    
    // Add active class to clicked button
    if (clickedButton) {
        clickedButton.classList.add('active');
        console.log('Activated button:', clickedButton.textContent);
    } else {
        // Find and activate the correct button when called programmatically
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const btnText = btn.textContent.toLowerCase();
            if ((tabName === 'single' && btnText.includes('single')) ||
                (tabName === 'book' && btnText.includes('book')) ||
                (tabName === 'preview' && btnText.includes('preview'))) {
                btn.classList.add('active');
                console.log('Programmatically activated button:', btn.textContent);
            }
        });
    }
}

// Function to show tab programmatically
function showTabByName(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Activate the correct button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes(tabName)) {
            btn.classList.add('active');
        }
    });
}

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing event listeners...');
    
    // Tab button listeners
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            console.log('Tab button clicked:', tabName);
            showTab(tabName, this);
        });
    });
    console.log('Tab button listeners added');
    
    // Single puzzle form
    const singleForm = document.getElementById('single-puzzle-form');
    if (singleForm) {
        singleForm.addEventListener('submit', handleSinglePuzzle);
        console.log('Single puzzle form listener added');
    }
    
    // Book generation form
    const bookForm = document.getElementById('book-form');
    if (bookForm) {
        bookForm.addEventListener('submit', handleBookGeneration);
        console.log('Book form listener added');
    }
    
    // Export buttons
    const exportPdfBtn = document.getElementById('export-pdf');
    const exportImagesBtn = document.getElementById('export-images');
    
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', exportPDF);
        console.log('Export PDF listener added');
    }
    
    if (exportImagesBtn) {
        exportImagesBtn.addEventListener('click', exportImages);
        console.log('Export images listener added');
    }
    
    // Test tab elements
    console.log('Tab elements check:');
    console.log('single-tab:', document.getElementById('single-tab'));
    console.log('book-tab:', document.getElementById('book-tab'));
    console.log('preview-tab:', document.getElementById('preview-tab'));
    
    // Initial state
    updateExportControls();
});

// Handle Single Puzzle Generation
async function handleSinglePuzzle(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        theme: formData.get('theme'),
        difficulty: formData.get('difficulty'),
        useN8N: formData.get('useN8N') === 'on'
    };
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/generate-puzzle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentPuzzles = [result.puzzle];
            displaySinglePuzzle(result.puzzle);
            updateExportControls();
        } else {
            alert('Error generating puzzle: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate puzzle. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Handle Book Generation
async function handleBookGeneration(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        theme: formData.get('theme'),
        difficulty: formData.get('difficulty'),
        puzzleCount: parseInt(formData.get('puzzleCount')),
        bookTitle: formData.get('bookTitle'),
        includeAnswers: formData.get('includeAnswers') === 'on',
        useN8N: formData.get('useN8N') === 'on'
    };
    
    showBookProgress(true);
    updateProgress(0, 'Starting book generation...');
    
    try {
        // Simulate progress for user feedback
        const progressInterval = setInterval(() => {
            const progressBar = document.getElementById('progress-fill');
            const currentProgress = parseInt(progressBar.style.width) || 0;
            if (currentProgress < 90) {
                updateProgress(currentProgress + Math.random() * 10, `Generating puzzle ${Math.floor(currentProgress / (100 / data.puzzleCount)) + 1} of ${data.puzzleCount}...`);
            }
        }, 2000);
        
        const response = await fetch('/api/generate-book', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        clearInterval(progressInterval);
        
        const result = await response.json();
        
        if (result.success) {
            currentBookData = result.bookData;
            currentPuzzles = result.bookData.puzzles;
            updateProgress(100, `Book generation complete! Generated ${result.bookData.puzzles.length} puzzles.`);
            displayBookResult(result.bookData);
            updateExportControls();
            
            // Automatically switch to preview tab after successful generation
            setTimeout(() => {
                showTabByName('preview');
                loadPuzzlePreviews();
            }, 2000);
        } else {
            updateProgress(0, 'Generation failed!');
            alert('Error generating book: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        updateProgress(0, 'Generation failed!');
        alert('Failed to generate book. Please try again.');
    } finally {
        setTimeout(() => showBookProgress(false), 3000);
    }
}

// Display Single Puzzle
function displaySinglePuzzle(puzzle) {
    const resultDiv = document.getElementById('single-result');
    const displayDiv = document.getElementById('single-puzzle-display');
    
    displayDiv.innerHTML = `
        <div class="puzzle-info">
            <h4>Puzzle #${puzzle.puzzleNumber || 1}</h4>
            <p><strong>Theme:</strong> ${capitalize(puzzle.theme)}</p>
            <p><strong>Difficulty:</strong> ${capitalize(puzzle.difficulty)}</p>
            <p><strong>Words:</strong> ${(puzzle.clues?.across?.length || 0) + (puzzle.clues?.down?.length || 0)}</p>
        </div>
        ${renderCrosswordGrid(puzzle)}
        ${renderClues(puzzle.clues)}
    `;
    
    resultDiv.style.display = 'block';
}

// Display Book Result
function displayBookResult(bookData) {
    const resultDiv = document.getElementById('book-result');
    const detailsDiv = document.getElementById('book-details');
    
    const totalWords = bookData.puzzles.reduce((sum, puzzle) => {
        return sum + (puzzle.clues?.across?.length || 0) + (puzzle.clues?.down?.length || 0);
    }, 0);
    
    detailsDiv.innerHTML = `
        <div class="book-stats">
            <div class="stat-card">
                <h4>${bookData.puzzleCount}</h4>
                <p>Total Puzzles</p>
            </div>
            <div class="stat-card">
                <h4>${totalWords}</h4>
                <p>Total Words</p>
            </div>
            <div class="stat-card">
                <h4>${capitalize(bookData.theme)}</h4>
                <p>Theme</p>
            </div>
            <div class="stat-card">
                <h4>${capitalize(bookData.difficulty)}</h4>
                <p>Difficulty</p>
            </div>
        </div>
        <p><strong>Book Title:</strong> ${bookData.title}</p>
    `;
    
    resultDiv.style.display = 'block';
}

// Render Crossword Grid
function renderCrosswordGrid(puzzle) {
    if (!puzzle.grid) return '<p>No grid data available</p>';
    
    const grid = puzzle.grid;
    let html = '<div class="crossword-grid">';
    
    for (let row = 0; row < grid.length; row++) {
        html += '<div class="crossword-row">';
        for (let col = 0; col < grid[row].length; col++) {
            const cell = grid[row][col];
            let cellClass = 'crossword-cell';
            let cellContent = '';
            
            if (cell === '■') {
                cellClass += ' black';
            } else if (cell === '') {
                cellClass += ' empty';
            } else {
                cellContent = cell;
                // Add number if this is a word start (simplified)
                const number = getWordNumber(puzzle, row, col);
                if (number) {
                    cellContent = `<span class="number">${number}</span>`;
                }
            }
            
            html += `<div class="${cellClass}">${cellContent}</div>`;
        }
        html += '</div>';
    }
    
    html += '</div>';
    return html;
}

// Get word number for cell (simplified)
function getWordNumber(puzzle, row, col) {
    // This is a simplified implementation
    // In practice, you'd need to track word start positions
    return null;
}

// Render Clues
function renderClues(clues) {
    if (!clues) return '<p>No clues available</p>';
    
    let html = '<div class="clues-section">';
    
    // Across clues
    html += '<div class="clues-column">';
    html += '<h4>Across</h4>';
    if (clues.across && clues.across.length > 0) {
        clues.across.forEach(clue => {
            html += `<div class="clue-item">
                <span class="clue-number">${clue.number}.</span>
                ${clue.clue}
            </div>`;
        });
    } else {
        html += '<p>No across clues</p>';
    }
    html += '</div>';
    
    // Down clues
    html += '<div class="clues-column">';
    html += '<h4>Down</h4>';
    if (clues.down && clues.down.length > 0) {
        clues.down.forEach(clue => {
            html += `<div class="clue-item">
                <span class="clue-number">${clue.number}.</span>
                ${clue.clue}
            </div>`;
        });
    } else {
        html += '<p>No down clues</p>';
    }
    html += '</div>';
    
    html += '</div>';
    return html;
}

// Export as PDF
async function exportPDF() {
    if (!currentPuzzles.length) {
        alert('No puzzles to export');
        return;
    }
    
    showLoading(true, 'Generating PDF...');
    
    try {
        const response = await fetch('/api/export-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                puzzles: currentPuzzles,
                bookTitle: currentBookData?.title || 'Crossword Puzzles',
                includeAnswers: true
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Create download links
            result.files.forEach(file => {
                const link = document.createElement('a');
                link.href = file.downloadUrl;
                link.download = file.filename;
                link.click();
            });
        } else {
            alert('Error exporting PDF: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to export PDF. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Export as Images
async function exportImages() {
    alert('Image export feature coming soon!');
}

// Update Export Controls
function updateExportControls() {
    const exportControls = document.getElementById('export-controls');
    const noPuzzles = document.getElementById('no-puzzles');
    
    if (currentPuzzles.length > 0) {
        exportControls.style.display = 'block';
        noPuzzles.style.display = 'none';
    } else {
        exportControls.style.display = 'none';
        noPuzzles.style.display = 'block';
    }
}

// Show/Hide Loading
function showLoading(show, message = 'Generating puzzles...') {
    const loading = document.getElementById('loading');
    if (show) {
        loading.querySelector('p').textContent = message;
        loading.style.display = 'flex';
    } else {
        loading.style.display = 'none';
    }
}

// Show/Hide Book Progress
function showBookProgress(show) {
    const progress = document.getElementById('book-progress');
    const result = document.getElementById('book-result');
    
    if (show) {
        progress.style.display = 'block';
        result.style.display = 'none';
    } else {
        progress.style.display = 'none';
    }
}

// Update Progress
function updateProgress(percent, message) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressFill) {
        progressFill.style.width = percent + '%';
    }
    
    if (progressText) {
        progressText.textContent = message;
    }
}

// Utility Functions
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Load puzzle previews in the preview tab
function loadPuzzlePreviews() {
    const previewSection = document.getElementById('puzzle-preview');
    
    if (!currentPuzzles || currentPuzzles.length === 0) {
        previewSection.innerHTML = '<p>No puzzles to preview. Generate puzzles first.</p>';
        return;
    }
    
    let previewHTML = '<h3>Puzzle Previews</h3>';
    
    // Show first 3 puzzles as preview
    const previewCount = Math.min(3, currentPuzzles.length);
    
    for (let i = 0; i < previewCount; i++) {
        const puzzle = currentPuzzles[i];
        previewHTML += `
            <div class="puzzle-preview-item">
                <h4>Puzzle ${puzzle.puzzleNumber || i + 1} - ${capitalize(puzzle.theme)}</h4>
                <div class="preview-grid">
                    ${renderCrosswordGrid(puzzle)}
                </div>
                <div class="preview-clues">
                    ${renderClues(puzzle.clues)}
                </div>
            </div>
            <hr>
        `;
    }
    
    if (currentPuzzles.length > 3) {
        previewHTML += `<p><strong>...and ${currentPuzzles.length - 3} more puzzles</strong></p>`;
    }
    
    previewSection.innerHTML = previewHTML;
}

// Simulate progress for book generation
function simulateBookProgress(totalPuzzles) {
    let completed = 0;
    const interval = setInterval(() => {
        completed += Math.random() * 10;
        if (completed >= totalPuzzles) {
            completed = totalPuzzles;
            clearInterval(interval);
        }
        
        const percent = (completed / totalPuzzles) * 100;
        updateProgress(percent, `Generated ${Math.floor(completed)} of ${totalPuzzles} puzzles...`);
    }, 500);
}