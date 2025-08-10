# Cyan Science Journal - Peer Review System

A modern, real-time peer review system built with Convex and React, featuring automated workflows, Google Scholar integration, and MCP (Model Context Protocol) endpoints.

## 🚀 Features

- **Real-time Collaboration**: Live updates using Convex reactive database
- **Peer Review Workflow**: Complete manuscript submission, review assignment, and publication pipeline
- **Google Scholar Integration**: Automatic metadata generation with ScholarMeta component
- **MCP Endpoints**: RESTful API for external integrations
- **Authentication**: Secure user management with Convex Auth
- **Automated Notifications**: Cron-based email reminders for overdue reviews
- **File Storage**: PDF manuscript handling with Convex storage

## 🏗️ Architecture

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS
- **Backend**: Convex (reactive database + serverless functions)
- **Authentication**: Convex Auth with username/password
- **Deployment**: Docker + Google Cloud Run
- **CI/CD**: GitHub Actions

## 🛠️ Local Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Convex account

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/cyan-science/journal-mcp.git
   cd journal-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev
   ```
   This will create a `.env.local` file with your Convex deployment URL.

4. **Start development servers**
   ```bash
   npm run dev
   ```
   This runs both the Vite frontend and Convex backend in parallel.

5. **Access the application**
   - Frontend: http://localhost:5173
   - Convex Dashboard: https://dashboard.convex.dev

### Database Schema

The system uses the following main tables:

- **users**: User authentication and profiles
- **userData**: Extended user data with roles (author, editor, reviewer)
- **manuscripts**: Submitted papers with metadata
- **reviews**: Peer review assignments and submissions

## 🔌 API Endpoints

The system exposes RESTful HTTP endpoints for external integrations. For agent-based interactions, see the [MCP Server documentation](mcp_server/README.md).

### Base URL
- **Development**: `http://localhost:5173`
- **Production**: `https://cyan-science-journal-[hash]-uc.a.run.app`

### Endpoints

#### Health Check
```http
GET /health
```

#### Manuscripts
```http
# Submit a new manuscript
POST /api/mcp/manuscripts
Content-Type: application/json

{
  "title": "Paper Title",
  "authorIds": ["user_id_1", "user_id_2"],
  "abstract": "Paper abstract...",
  "keywords": ["keyword1", "keyword2"],
  "language": "en",
  "fileId": "storage_file_id"
}

# Get all manuscripts
GET /api/mcp/manuscripts

# Update manuscript status
PATCH /api/mcp/manuscripts/{id}/status
Content-Type: application/json

{
  "status": "published",
  "slug": "paper-slug"
}
```

### Postman Collection

Import our comprehensive API collection for testing:
**[Download Postman Collection](https://api.postman.com/collections/cyan-science-journal)**

## 📊 ScholarMeta Component

The `ScholarMeta` component automatically generates Google Scholar-compatible metadata for published articles:

### Features
- **Citation Metadata**: Automatic generation of citation_title, citation_author, etc.
- **Language Detection**: Smart language detection from abstract text
- **PDF URLs**: Direct links to manuscript files
- **Publication Dates**: Formatted publication timestamps

### Usage
```tsx
import ScholarMeta from './components/ScholarMeta';

<ScholarMeta manuscript={manuscript} />
```

### Generated Meta Tags
- `citation_title`
- `citation_author` (multiple)
- `citation_pdf_url`
- `citation_publication_date`
- `citation_language`

## 🚀 Production Deployment

### GitHub Actions CI/CD

The repository includes automated deployment via GitHub Actions:

1. **Lint & Test**: Code quality checks
2. **Build & Push**: Docker image to GitHub Container Registry
3. **Deploy Convex**: Backend deployment to Convex production
4. **Deploy Cloud Run**: Frontend deployment to Google Cloud Run

### Required Secrets

Set these in your GitHub repository settings:

```bash
CONVEX_DEPLOY_KEY=your_convex_deploy_key
CONVEX_PROD_URL=https://your-prod-deployment.convex.cloud
GCP_SA_KEY=your_gcp_service_account_json
```

### Manual Deployment

#### Docker Build
```bash
docker build -t ghcr.io/cyan-science/journal-mcp:latest .
docker push ghcr.io/cyan-science/journal-mcp:latest
```

#### Convex Production
```bash
npx convex deploy --prod
```

#### Cloud Run Deployment
```bash
gcloud run deploy cyan-science-journal \
  --image ghcr.io/cyan-science/journal-mcp:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="VITE_CONVEX_URL=https://your-prod.convex.cloud"
```

## 🔧 Configuration

### Environment Variables

- `VITE_CONVEX_URL`: Convex deployment URL
- `CONVEX_DEPLOY_KEY`: Production deployment key
- `NODE_ENV`: Environment (development/production)

### Convex Functions

Key backend functions:

- **Queries**: `getSubmissions`, `getReview`, `getPublishedBySlug`
- **Mutations**: `createManuscript`, `assignReviewer`, `submitReview`
- **Actions**: `checkForOverdueReviews`, `notifyUser`
- **Crons**: Hourly overdue review checks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: Convex Docs
- **Community**: Convex Discord

---

**Deployment URLs will be displayed here after successful CI/CD:**
- 🌐 **Cloud Run**: `https://cyan-science-journal-[hash]-uc.a.run.app`
- ⚡ **Convex Production**: `https://your-prod-deployment.convex.cloud`
