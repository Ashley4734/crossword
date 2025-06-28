const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { generatePuzzlePDF, generateSolutionPDF } = require('./utils/pdfGenerator');
const { createCrosswordGrid, generateClues } = require('./utils/crosswordEngine');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// N8N Integration endpoints
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8n.tealogik.com/webhook/crossword';

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Generate single crossword puzzle
app.post('/api/generate-puzzle', async (req, res) => {
  try {
    const { theme = 'general', difficulty = 'medium', useN8N = false } = req.body;
    
    let puzzleData;
    
    if (useN8N) {
      // Use N8N workflow
      const response = await axios.post(N8N_WEBHOOK_URL, {
        puzzleCount: 1,
        batchSize: 1,
        bookTheme: theme,
        difficulty: difficulty,
        bookTitle: 'Single Puzzle'
      });
      puzzleData = response.data;
    } else {
      // Use local generator
      puzzleData = await generateLocalPuzzle(theme, difficulty);
    }
    
    res.json({
      success: true,
      puzzle: puzzleData
    });
  } catch (error) {
    console.error('Error generating puzzle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate puzzle'
    });
  }
});

// Generate book batch
app.post('/api/generate-book', async (req, res) => {
  try {
    const { 
      theme = 'general', 
      difficulty = 'medium', 
      puzzleCount = 50, 
      bookTitle = 'Crossword Puzzle Book',
      includeAnswers = true,
      useN8N = true
    } = req.body;
    
    let puzzles = [];
    
    if (useN8N) {
      // Generate puzzles one by one using N8N workflow
      for (let i = 0; i < puzzleCount; i++) {
        try {
          console.log(`Generating puzzle ${i + 1} of ${puzzleCount}`);
          
          const response = await axios.post(N8N_WEBHOOK_URL, {
            puzzleCount: 1,
            batchSize: 1,
            bookTheme: theme,
            difficulty: difficulty,
            bookTitle: `${bookTitle} - Puzzle ${i + 1}`
          }, {
            timeout: 60000 // 60 second timeout per puzzle
          });
          
          // Extract puzzle from response
          let puzzle;
          if (response.data && response.data.puzzle) {
            puzzle = response.data.puzzle;
            puzzle.puzzleNumber = i + 1;
          } else if (response.data) {
            puzzle = response.data;
            puzzle.puzzleNumber = i + 1;
          } else {
            throw new Error('Invalid response format');
          }
          
          puzzles.push(puzzle);
          
          // Small delay between requests to avoid overwhelming N8N
          if (i < puzzleCount - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (puzzleError) {
          console.error(`Error generating puzzle ${i + 1}:`, puzzleError.message);
          
          // Generate fallback puzzle locally
          const fallbackPuzzle = await generateLocalPuzzle(theme, difficulty, i + 1);
          puzzles.push(fallbackPuzzle);
        }
      }
    } else {
      // Generate locally in batches
      for (let i = 0; i < puzzleCount; i++) {
        const puzzle = await generateLocalPuzzle(theme, difficulty, i + 1);
        puzzles.push(puzzle);
      }
    }
    
    res.json({
      success: true,
      bookData: {
        title: bookTitle,
        theme: theme,
        difficulty: difficulty,
        puzzleCount: puzzles.length,
        puzzles: puzzles,
        includeAnswers: includeAnswers
      }
    });
  } catch (error) {
    console.error('Error generating book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate book: ' + error.message
    });
  }
});

// Export puzzle as PDF
app.post('/api/export-pdf', async (req, res) => {
  try {
    const { puzzles, bookTitle, includeAnswers = true } = req.body;
    
    if (!puzzles || puzzles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No puzzles provided for export'
      });
    }
    
    console.log(`Exporting ${puzzles.length} puzzles to PDF...`);
    
    // Generate puzzle PDF
    const puzzlePdfPath = await generatePuzzlePDF(puzzles, bookTitle);
    
    const files = [puzzlePdfPath];
    
    // Generate solution PDF if requested
    if (includeAnswers) {
      const solutionPdfPath = await generateSolutionPDF(puzzles, bookTitle);
      files.push(solutionPdfPath);
    }
    
    res.json({
      success: true,
      files: files.map(file => ({
        filename: path.basename(file),
        downloadUrl: `/downloads/${path.basename(file)}`
      }))
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export PDF: ' + error.message
    });
  }
});

// Progress endpoint for book generation
app.get('/api/book-progress/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const progress = bookProgress.get(sessionId) || { completed: 0, total: 0, status: 'not_found' };
  
  res.json(progress);
});

// Store book generation progress
const bookProgress = new Map();

// Download generated files
app.get('/downloads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'downloads', filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// Local puzzle generation fallback
async function generateLocalPuzzle(theme, difficulty, puzzleNumber = 1) {
  const wordList = getThemeWords(theme);
  const grid = createCrosswordGrid(wordList, difficulty);
  const clues = generateClues(grid.placedWords, theme);
  
  return {
    puzzleNumber: puzzleNumber,
    theme: theme,
    difficulty: difficulty,
    grid: grid.grid,
    clues: {
      across: clues.across,
      down: clues.down
    },
    metadata: {
      generated: new Date().toISOString(),
      totalWords: clues.across.length + clues.down.length,
      gridSize: grid.grid.length
    }
  };
}

// Theme-based word lists
function getThemeWords(theme) {
  const wordLists = {
    general: ['WORD', 'PUZZLE', 'GAME', 'BRAIN', 'THINK', 'SOLVE', 'CLUE', 'GRID', 'CROSS', 'DOWN', 'ACROSS', 'LETTER', 'BOOK', 'PAGE', 'LINE', 'TEXT', 'READ', 'WRITE', 'LEARN', 'STUDY'],
    animals: ['CAT', 'DOG', 'BIRD', 'FISH', 'LION', 'TIGER', 'BEAR', 'WOLF', 'DEER', 'RABBIT', 'MOUSE', 'HORSE', 'ELEPHANT', 'MONKEY', 'SNAKE', 'FROG', 'EAGLE', 'SHARK', 'WHALE', 'DOLPHIN'],
    food: ['PIZZA', 'BREAD', 'CHEESE', 'APPLE', 'ORANGE', 'BANANA', 'GRAPE', 'LEMON', 'TOMATO', 'CARROT', 'ONION', 'GARLIC', 'RICE', 'PASTA', 'MEAT', 'FISH', 'CHICKEN', 'BEEF', 'PORK', 'LAMB'],
    sports: ['SOCCER', 'TENNIS', 'GOLF', 'BOXING', 'HOCKEY', 'RUGBY', 'CRICKET', 'SKIING', 'SWIMMING', 'RUNNING', 'CYCLING', 'BASEBALL', 'FOOTBALL', 'VOLLEYBALL', 'BADMINTON', 'ARCHERY', 'FENCING', 'WRESTLING', 'DIVING', 'SURFING']
  };
  
  return wordLists[theme] || wordLists.general;
}

// Create downloads directory
if (!fs.existsSync('downloads')) {
  fs.mkdirSync('downloads');
}

// Start server
app.listen(PORT, () => {
  console.log(`Crossword KDP Generator running on port ${PORT}`);
  console.log(`Access the application at http://localhost:${PORT}`);
});

module.exports = app;