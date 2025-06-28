// Crossword puzzle generation engine
class CrosswordEngine {
  constructor() {
    this.GRID_SIZE = 15;
    this.BLACK_SQUARE = '■';
  }

  createCrosswordGrid(wordList, difficulty = 'medium') {
    const grid = Array(this.GRID_SIZE).fill().map(() => Array(this.GRID_SIZE).fill(''));
    const placedWords = [];
    
    // Filter and prepare words
    const words = this.prepareWords(wordList);
    
    if (words.length === 0) {
      return this.createFallbackGrid();
    }
    
    // Target word count based on difficulty
    const targetWords = {
      'easy': 50,
      'medium': 70,
      'hard': 85
    }[difficulty] || 70;
    
    // Sort words by length (longest first for better placement)
    const sortedWords = words.sort((a, b) => b.length - a.length);
    
    // Place first word in center horizontally
    this.placeFirstWord(grid, sortedWords[0], placedWords);
    
    // Place remaining words
    this.placeRemainingWords(grid, sortedWords.slice(1), placedWords, targetWords);
    
    // Fill black squares for symmetry
    this.createSymmetricBlackSquares(grid);
    
    return {
      grid: grid,
      placedWords: this.assignNumbers(placedWords)
    };
  }

  prepareWords(wordList) {
    let words = [];
    
    if (Array.isArray(wordList)) {
      words = wordList;
    } else if (typeof wordList === 'string') {
      words = wordList.split(/\s+/);
    }
    
    return words
      .map(w => String(w).trim().toUpperCase())
      .filter(w => w.length >= 3 && w.length <= 15 && /^[A-Z]+$/.test(w))
      .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicates
      .slice(0, 200); // Limit to 200 words
  }

  placeFirstWord(grid, word, placedWords) {
    const centerRow = Math.floor(this.GRID_SIZE / 2);
    const startCol = Math.floor((this.GRID_SIZE - word.length) / 2);
    
    for (let i = 0; i < word.length; i++) {
      grid[centerRow][startCol + i] = word[i];
    }
    
    placedWords.push({
      word: word,
      row: centerRow,
      col: startCol,
      direction: 'across',
      number: 1
    });
  }

  placeRemainingWords(grid, words, placedWords, targetWords) {
    let wordNumber = 2;
    let attempts = 0;
    const maxAttempts = words.length * 20;
    
    for (let i = 0; i < words.length && placedWords.length < targetWords && attempts < maxAttempts; i++) {
      attempts++;
      const word = words[i % words.length];
      
      // Skip if word already placed
      if (placedWords.some(p => p.word === word)) continue;
      
      const placement = this.findBestPlacement(grid, word, placedWords);
      
      if (placement) {
        this.placeWordInGrid(grid, word, placement);
        placement.number = wordNumber++;
        placement.word = word;
        placedWords.push(placement);
      }
    }
  }

  findBestPlacement(grid, word, placedWords) {
    const placements = [];
    
    // Try to intersect with existing words
    for (const placedWord of placedWords) {
      for (let i = 0; i < word.length; i++) {
        for (let j = 0; j < placedWord.word.length; j++) {
          if (word[i] === placedWord.word[j]) {
            // Try placing perpendicular to existing word
            const newDirection = placedWord.direction === 'across' ? 'down' : 'across';
            
            let newRow, newCol;
            if (newDirection === 'across') {
              newRow = placedWord.row + j;
              newCol = placedWord.col - i;
            } else {
              newRow = placedWord.row - i;
              newCol = placedWord.col + j;
            }
            
            if (this.canPlaceWord(grid, word, newRow, newCol, newDirection)) {
              placements.push({
                row: newRow,
                col: newCol,
                direction: newDirection,
                score: this.calculatePlacementScore(grid, word, newRow, newCol, newDirection, placedWords)
              });
            }
          }
        }
      }
    }
    
    // If no intersections found, try placing in empty spaces
    if (placements.length === 0 && placedWords.length < 15) {
      for (let row = 1; row < this.GRID_SIZE - 1; row++) {
        for (let col = 1; col < this.GRID_SIZE - word.length - 1; col++) {
          if (this.canPlaceWord(grid, word, row, col, 'across')) {
            placements.push({
              row: row,
              col: col,
              direction: 'across',
              score: this.calculatePlacementScore(grid, word, row, col, 'across', placedWords)
            });
          }
          if (this.canPlaceWord(grid, word, row, col, 'down')) {
            placements.push({
              row: row,
              col: col,
              direction: 'down',
              score: this.calculatePlacementScore(grid, word, row, col, 'down', placedWords)
            });
          }
        }
      }
    }
    
    // Return best placement (highest score)
    return placements.sort((a, b) => b.score - a.score)[0] || null;
  }

  canPlaceWord(grid, word, row, col, direction) {
    // Check bounds
    if (direction === 'across') {
      if (col < 0 || col + word.length > this.GRID_SIZE || row < 0 || row >= this.GRID_SIZE) {
        return false;
      }
    } else {
      if (row < 0 || row + word.length > this.GRID_SIZE || col < 0 || col >= this.GRID_SIZE) {
        return false;
      }
    }
    
    // Check if word fits without conflicts
    for (let i = 0; i < word.length; i++) {
      const checkRow = direction === 'across' ? row : row + i;
      const checkCol = direction === 'across' ? col + i : col;
      
      const existingLetter = grid[checkRow][checkCol];
      if (existingLetter !== '' && existingLetter !== word[i] && existingLetter !== this.BLACK_SQUARE) {
        return false;
      }
    }
    
    return true;
  }

  placeWordInGrid(grid, word, placement) {
    for (let i = 0; i < word.length; i++) {
      const row = placement.direction === 'across' ? placement.row : placement.row + i;
      const col = placement.direction === 'across' ? placement.col + i : placement.col;
      grid[row][col] = word[i];
    }
  }

  calculatePlacementScore(grid, word, row, col, direction, placedWords) {
    let score = 0;
    
    // Prefer central placements
    const centerRow = Math.floor(this.GRID_SIZE / 2);
    const centerCol = Math.floor(this.GRID_SIZE / 2);
    const distance = Math.abs(row - centerRow) + Math.abs(col - centerCol);
    score += (this.GRID_SIZE - distance) * 2;
    
    // Count intersections (higher is better)
    let intersections = 0;
    for (let i = 0; i < word.length; i++) {
      const checkRow = direction === 'across' ? row : row + i;
      const checkCol = direction === 'across' ? col + i : col;
      
      if (grid[checkRow] && grid[checkRow][checkCol] === word[i]) {
        intersections++;
      }
    }
    score += intersections * 15;
    
    // Prefer words that connect to multiple existing words
    score += Math.min(placedWords.length, 5) * 3;
    
    return score;
  }

  createSymmetricBlackSquares(grid) {
    // Fill remaining empty cells as black squares with rotational symmetry
    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        if (grid[row][col] === '') {
          const symmetricRow = this.GRID_SIZE - 1 - row;
          const symmetricCol = this.GRID_SIZE - 1 - col;
          
          if (grid[symmetricRow] && grid[symmetricRow][symmetricCol] === '') {
            grid[row][col] = this.BLACK_SQUARE;
            grid[symmetricRow][symmetricCol] = this.BLACK_SQUARE;
          }
        }
      }
    }
  }

  assignNumbers(placedWords) {
    // Create a map of starting positions to numbers
    const positions = new Map();
    
    // Sort words by position (top to bottom, left to right)
    const sortedWords = placedWords.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
    
    let number = 1;
    
    for (const word of sortedWords) {
      const key = `${word.row},${word.col}`;
      
      if (!positions.has(key)) {
        positions.set(key, number++);
      }
      
      word.number = positions.get(key);
    }
    
    return placedWords;
  }

  createFallbackGrid() {
    const fallbackWords = ['CROSSWORD', 'PUZZLE', 'GAME', 'WORD', 'CLUE', 'GRID', 'SOLVE', 'THINK'];
    return this.createCrosswordGrid(fallbackWords, 'medium');
  }
}

// Clue generation
function generateClues(placedWords, theme) {
  const across = [];
  const down = [];
  
  // Simple clue templates
  const clueTemplates = {
    general: {
      'WORD': 'Unit of language',
      'PUZZLE': 'Brain teaser',
      'GAME': 'Form of play',
      'CLUE': 'Helpful hint',
      'GRID': 'Crossword layout',
      'SOLVE': 'Find the answer',
      'THINK': 'Use your mind'
    },
    animals: {
      'CAT': 'Feline pet',
      'DOG': 'Man\'s best friend',
      'BIRD': 'Feathered flyer',
      'FISH': 'Aquatic animal',
      'LION': 'King of beasts'
    },
    food: {
      'PIZZA': 'Italian flatbread',
      'BREAD': 'Baked staple',
      'CHEESE': 'Dairy product',
      'APPLE': 'Red fruit',
      'ORANGE': 'Citrus fruit'
    },
    sports: {
      'SOCCER': 'World\'s most popular sport',
      'TENNIS': 'Racquet sport',
      'GOLF': 'Links game',
      'BOXING': 'Fighting sport',
      'HOCKEY': 'Ice sport'
    }
  };
  
  const templates = clueTemplates[theme] || clueTemplates.general;
  
  placedWords.forEach(wordData => {
    const clue = {
      number: wordData.number,
      clue: templates[wordData.word] || `Clue for ${wordData.word}`,
      answer: wordData.word
    };
    
    if (wordData.direction === 'across') {
      across.push(clue);
    } else {
      down.push(clue);
    }
  });
  
  // Sort by number
  across.sort((a, b) => a.number - b.number);
  down.sort((a, b) => a.number - b.number);
  
  return { across, down };
}

// Export functions
const engine = new CrosswordEngine();

module.exports = {
  createCrosswordGrid: (wordList, difficulty) => engine.createCrosswordGrid(wordList, difficulty),
  generateClues: generateClues
};