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
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/crossword';

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
      // Use N8N workflow for batch generation
      const response = await axios.post(N8N_WEBHOOK_URL, {
        puzzleCount: puzzleCount,
        batchSize: 10,
        bookTheme: theme,
        difficulty: difficulty,
        bookTitle: bookTitle
      });
      
      // Handle batch response
      if (response.data && Array.isArray(response.data)) {
        puzzles = response.data;
      } else {
        puzzles = [response.data];
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
        puzzles: puzzles
      }
    });
  } catch (error) {
    console.error('Error generating book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate book'
    });
  }
});

// Export puzzle as PDF
app.post('/api/export-pdf', async (req, res) => {
  try {
    const { puzzles, bookTitle, includeAnswers = true } = req.body;
    
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
      error: 'Failed to export PDF'
    });
  }
});

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