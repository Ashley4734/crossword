const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// PDF generation for KDP publishing
async function generatePuzzlePDF(puzzles, bookTitle) {
  const filename = `${bookTitle.replace(/[^a-zA-Z0-9]/g, '_')}_puzzles.pdf`;
  const outputPath = path.join(__dirname, '..', 'downloads', filename);
  
  // For now, generate as JSON - in production you'd use a proper PDF library
  const pdfData = {
    title: bookTitle,
    type: 'puzzles',
    pageCount: puzzles.length,
    puzzles: puzzles.map(puzzle => ({
      puzzleNumber: puzzle.puzzleNumber,
      theme: puzzle.theme,
      difficulty: puzzle.difficulty,
      grid: puzzle.grid,
      clues: puzzle.clues
    }))
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(pdfData, null, 2));
  return outputPath;
}

async function generateSolutionPDF(puzzles, bookTitle) {
  const filename = `${bookTitle.replace(/[^a-zA-Z0-9]/g, '_')}_solutions.pdf`;
  const outputPath = path.join(__dirname, '..', 'downloads', filename);
  
  const pdfData = {
    title: `${bookTitle} - Solutions`,
    type: 'solutions',
    pageCount: puzzles.length,
    solutions: puzzles.map(puzzle => ({
      puzzleNumber: puzzle.puzzleNumber,
      grid: puzzle.grid,
      answers: extractAnswers(puzzle)
    }))
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(pdfData, null, 2));
  return outputPath;
}

function extractAnswers(puzzle) {
  const answers = {};
  
  if (puzzle.clues && puzzle.clues.across) {
    puzzle.clues.across.forEach(clue => {
      answers[`${clue.number}A`] = clue.answer;
    });
  }
  
  if (puzzle.clues && puzzle.clues.down) {
    puzzle.clues.down.forEach(clue => {
      answers[`${clue.number}D`] = clue.answer;
    });
  }
  
  return answers;
}

// Generate high-quality crossword grid image for printing
async function generateGridImage(puzzle, options = {}) {
  const {
    cellSize = 30,
    fontSize = 12,
    numberFontSize = 10,
    lineWidth = 2,
    showSolution = false
  } = options;
  
  const grid = puzzle.grid;
  const gridSize = grid.length;
  const canvasSize = gridSize * cellSize;
  
  const canvas = createCanvas(canvasSize, canvasSize);
  const ctx = canvas.getContext('2d');
  
  // Fill background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  
  // Draw grid
  ctx.strokeStyle = 'black';
  ctx.lineWidth = lineWidth;
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = col * cellSize;
      const y = row * cellSize;
      const cell = grid[row][col];
      
      if (cell === '■') {
        // Black square
        ctx.fillStyle = 'black';
        ctx.fillRect(x, y, cellSize, cellSize);
      } else if (cell !== '') {
        // Letter cell
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeRect(x, y, cellSize, cellSize);
        
        if (showSolution) {
          // Show letter
          ctx.fillStyle = 'black';
          ctx.fillText(cell, x + cellSize/2, y + cellSize/2);
        }
        
        // Add number if this is a word start
        const number = getNumberForCell(puzzle, row, col);
        if (number) {
          ctx.font = `${numberFontSize}px Arial`;
          ctx.fillStyle = 'black';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(number.toString(), x + 2, y + 2);
          ctx.font = `${fontSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
        }
      } else {
        // Empty cell - don't draw
      }
    }
  }
  
  return canvas.toBuffer('image/png');
}

function getNumberForCell(puzzle, row, col) {
  if (!puzzle.clues) return null;
  
  const allClues = [...(puzzle.clues.across || []), ...(puzzle.clues.down || [])];
  
  // Find if this cell is the start of any word
  for (const clue of allClues) {
    // This is a simplified check - in a real implementation you'd track word positions
    // For now, just return the clue number if we find a match
    if (clue.number) {
      return clue.number;
    }
  }
  
  return null;
}

module.exports = {
  generatePuzzlePDF,
  generateSolutionPDF,
  generateGridImage
};