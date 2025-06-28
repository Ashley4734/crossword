# Crossword KDP Generator

A professional crossword puzzle generator designed for Amazon KDP book publishing, with N8N workflow integration and Coolify deployment support.

## Features

- **KDP-Optimized**: Generate print-ready crossword puzzles for Amazon KDP publishing
- **Batch Generation**: Create entire books with 25-100 puzzles
- **N8N Integration**: Leverage your existing N8N workflow for AI-powered word and clue generation
- **Multiple Themes**: Support for 10+ themed puzzle categories
- **Difficulty Levels**: Easy, Medium, and Hard puzzle variants
- **Export Options**: PDF and image export for publishing
- **Coolify Ready**: One-click deployment on your self-hosted Coolify instance

## Quick Start

### Deploy on Coolify

1. **Create New Application** in Coolify
2. **Connect Repository**: Link to your Git repository containing this code
3. **Set Environment Variables**:
   ```env
   NODE_ENV=production
   PORT=3000
   N8N_WEBHOOK_URL=http://your-n8n:5678/webhook/crossword
   ```
4. **Deploy**: Coolify will automatically build and deploy your application

### Manual Installation

```bash
# Clone repository
git clone <your-repo-url>
cd crossword-puzzle-n8n

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env

# Start application
npm start
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t crossword-generator .
docker run -p 3000:3000 crossword-generator
```

## N8N Integration

### Existing Workflow

Your existing N8N workflow (`My_workflow_20.json`) is already configured with:
- Webhook trigger at `/webhook/crossword`
- Batch processing for multiple puzzles
- Replicate API integration for AI word/clue generation
- Theme-based word selection
- Grid generation algorithm

### Integration Setup

1. **Import Workflow**: Import your existing workflow into N8N
2. **Configure Webhook**: Ensure webhook is accessible at the configured URL
3. **Set API Keys**: Configure Replicate API credentials in N8N
4. **Test Connection**: Use the application's "Use N8N workflow" option

## Usage

### Single Puzzle Generation

1. Navigate to the "Single Puzzle" tab
2. Select theme and difficulty
3. Choose whether to use N8N workflow or local generation
4. Click "Generate Puzzle"

### Book Generation

1. Go to the "Book Generation" tab
2. Set book title, theme, and difficulty
3. Choose number of puzzles (25-100)
4. Select options for answer key inclusion
5. Click "Generate Book"

### Export & Publishing

1. After generation, go to "Preview & Export" tab
2. Review generated puzzles
3. Export as PDF for KDP publishing
4. Download files include:
   - Puzzle book (questions only)
   - Answer key (if selected)

## Publishing on Amazon KDP

### Preparation

1. **Generate Book**: Create 50-100 puzzles using the application
2. **Export PDFs**: Download both puzzle and solution PDFs
3. **Cover Design**: Create attractive book cover (not included in this tool)

### KDP Upload

1. **Manuscript**: Upload the puzzle PDF as your book content
2. **Cover**: Upload your custom cover design
3. **Metadata**: Set title, description, keywords, categories
4. **Pricing**: Set your book price and royalty options
5. **Publish**: Submit for KDP review

### Recommended Settings

- **Page Size**: US Trade (6" x 9")
- **Interior**: Black & white
- **Paper**: White paper
- **Binding**: Paperback
- **Bleed**: No bleed required for text-only content

## Configuration

### Environment Variables

```env
# Application
NODE_ENV=production
PORT=3000

# N8N Integration
N8N_WEBHOOK_URL=http://localhost:5678/webhook/crossword
N8N_API_KEY=your_api_key

# PDF Settings
PDF_QUALITY=high
IMAGE_DPI=300

# Caching
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
```

### Themes Available

- General Knowledge
- Animals
- Food & Cooking
- Sports
- Movies & Entertainment
- Science
- History
- Geography
- Literature
- Music

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   N8N Workflow  │
│   (React SPA)   │◄──►│   (Node.js)     │◄──►│   (AI/Replicate)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   PDF Export    │
                       │   (Puppeteer)   │
                       └─────────────────┘
```

## API Endpoints

- `POST /api/generate-puzzle` - Generate single puzzle
- `POST /api/generate-book` - Generate book batch
- `POST /api/export-pdf` - Export puzzles as PDF
- `GET /downloads/:filename` - Download generated files

## Troubleshooting

### Common Issues

1. **N8N Connection Failed**
   - Check N8N_WEBHOOK_URL in environment
   - Verify N8N workflow is active
   - Test webhook manually

2. **PDF Generation Errors**
   - Ensure sufficient memory allocation
   - Check file permissions on downloads directory
   - Verify puppeteer installation

3. **Slow Generation**
   - Reduce batch size for N8N processing
   - Check Replicate API rate limits
   - Consider local generation for testing

### Performance Optimization

- Use Redis caching for repeated requests
- Implement batch processing for large books
- Configure nginx for static file serving
- Use CDN for generated file distribution

## Support

For issues and feature requests, please use the repository's issue tracker.

## License

MIT License - see LICENSE file for details.