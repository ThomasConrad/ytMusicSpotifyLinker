# Structure Steering

## Project Organization

### Root Directory Structure
```
ytMusicSpotifyLinker/
├── README.md                 # Project overview and setup instructions
├── CLAUDE.md                 # Claude Code instructions and commands  
├── Cargo.toml               # Rust workspace configuration
├── Cargo.lock               # Dependency lock file (committed)
├── .spec-workflow/          # Spec-driven development artifacts
│   ├── steering/            # Project steering documents
│   └── specs/              # Feature specifications
├── backend/                 # Rust backend application
├── frontend/                # SolidJS frontend application
└── target/                 # Rust build artifacts (ignored)
```

### Backend Directory Structure (`backend/`)
```
backend/
├── Cargo.toml              # Package configuration and dependencies
├── Cargo.lock              # Dependency versions (committed)
├── build.rs                # Build script for compile-time generation
├── db.sqlite               # Development database file
├── src/                    # Source code
│   ├── main.rs            # Application entry point
│   ├── lib.rs             # Library root (re-exports)
│   ├── app.rs             # Application state and configuration
│   ├── api.rs             # API module root
│   ├── api/               # API implementation modules
│   │   ├── router.rs      # Route definitions and middleware
│   │   ├── auth.rs        # Authentication endpoints
│   │   └── protected.rs   # Protected endpoints (watchers)
│   ├── app/               # Application logic modules
│   │   ├── songlink.rs    # Songlink API client
│   │   ├── watcher.rs     # Watcher system implementation
│   │   └── watcher_simple.rs # Simplified watcher for testing
│   └── users/             # User management domain
│       ├── mod.rs         # Module exports
│       ├── models.rs      # Data models and types
│       ├── database.rs    # Database connection handling
│       ├── repository.rs  # Data access layer
│       └── repository_simple.rs # Simplified repository
├── migrations/             # SQLx database migrations
│   ├── 20231108213118_init.sql
│   └── 20250610185340_extend_schema_for_playlists.sql
├── templates/              # HTML templates (Askama)
│   ├── login.html         # Login form template
│   └── protected.html     # Protected area template
└── tests/                  # Test files
    ├── mod.rs             # Test utilities
    ├── lib.rs             # Unit test runner
    └── e2e.rs             # End-to-end integration tests
```

### Frontend Directory Structure (`frontend/`)
```
frontend/
├── package.json            # Node.js dependencies and scripts
├── package-lock.json       # Dependency lock file (committed)
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite build configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── postcss.config.js      # PostCSS plugins configuration
├── index.html             # HTML entry point
├── src/                   # Source code
│   ├── main.tsx           # Application entry point
│   ├── App.tsx            # Root application component
│   ├── index.css          # Global styles and Tailwind imports
│   ├── components/        # Reusable UI components
│   │   ├── Navbar.tsx     # Navigation bar component
│   │   └── ThemeToggle.tsx # Dark mode toggle
│   ├── contexts/          # React-style contexts for global state
│   │   └── ThemeContext.tsx # Theme management context
│   └── pages/             # Page components
│       ├── Home.tsx       # Landing page
│       ├── Login.tsx      # Login form page
│       ├── Dashboard.tsx  # Main application dashboard
│       └── About.tsx      # About/info page
└── node_modules/          # Node.js dependencies (ignored)
```

## File Naming Conventions

### Backend (Rust) Naming Conventions
- **Modules**: `snake_case` (e.g., `user_repository.rs`)
- **Structs/Enums**: `PascalCase` (e.g., `UserRepository`, `SyncStatus`)
- **Functions/Variables**: `snake_case` (e.g., `create_user`, `watcher_name`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `DEFAULT_PORT`, `MAX_RETRIES`)
- **Files**: `snake_case.rs` (e.g., `watcher_service.rs`)

### Frontend (TypeScript/SolidJS) Naming Conventions
- **Components**: `PascalCase.tsx` (e.g., `PlaylistCard.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `apiClient.ts`)
- **Types/Interfaces**: `PascalCase` (e.g., `User`, `PlaylistConfig`)
- **Functions/Variables**: `camelCase` (e.g., `getUserPlaylists`, `isLoading`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `API_BASE_URL`)

### Database Naming Conventions
- **Tables**: `snake_case` (e.g., `users`, `user_credentials`, `sync_operations`)
- **Columns**: `snake_case` (e.g., `user_id`, `created_at`, `playlist_name`)
- **Indexes**: `idx_tablename_columnname` (e.g., `idx_watchers_user_id`)
- **Foreign Keys**: `fk_tablename_columnname` (e.g., `fk_watchers_user_id`)

### Configuration File Conventions
- **Rust**: `Cargo.toml` (standard), `build.rs` (build scripts)
- **Frontend**: `package.json`, `vite.config.ts`, `tailwind.config.js`
- **Git**: `.gitignore` files in root and subdirectories as needed

## Module Organization

### Backend Module Architecture
```rust
// lib.rs - Public API exports
pub use app::App;
pub use api::Router;
pub use watcher::Watcher;

// Logical module hierarchy:
// - app/ (application state and configuration)
// - api/ (HTTP interface layer)
// - users/ (user domain logic)
// - [future] playlists/ (playlist domain)
// - [future] sync/ (synchronization engine)
```

### Frontend Component Hierarchy
```tsx
// Component organization strategy:
// - components/ (pure, reusable UI components)
// - pages/ (route-specific page components)
// - contexts/ (global state management)
// - hooks/ (custom reactive primitives - future)
// - utils/ (pure utility functions - future)
```

### Domain-Driven Module Strategy
- **User Domain**: Authentication, user management, sessions
- **Playlist Domain**: Playlist metadata, sync configurations  
- **Integration Domain**: External API clients (YouTube Music, Spotify)
- **Sync Domain**: Synchronization logic, conflict resolution
- **Common/Shared**: Database connections, error types, utilities

## Development Workflow

### Git Branching Strategy
- **Main Branch**: `master` (production-ready code)
- **Feature Branches**: `feature/feature-name` or `feat/feature-name`
- **Bug Fix Branches**: `fix/issue-description` or `bugfix/issue-description`
- **Hotfix Branches**: `hotfix/critical-issue` (direct to master)
- **Development Branch**: Not used (GitHub Flow model)

### Branch Naming Conventions
- **Features**: `feat/oauth-integration`, `feature/playlist-sync`
- **Bug Fixes**: `fix/login-redirect-loop`, `bugfix/session-timeout`
- **Experiments**: `experiment/new-sync-algorithm`
- **Documentation**: `docs/api-documentation`
- **Refactoring**: `refactor/user-repository-cleanup`

### Commit Message Standards
Follow Conventional Commits specification:
```
feat: add OAuth integration for Spotify
fix: resolve session timeout issue
docs: update API documentation
refactor: simplify watcher configuration
test: add integration tests for sync operations
```

### Code Review Process
1. **Feature Development**: Create feature branch from master
2. **Pull Request**: Submit PR with clear description and context
3. **Review Checklist**:
   - [ ] Code follows style guidelines
   - [ ] Tests pass (backend: `cargo test`, frontend: `npm test`)
   - [ ] No security vulnerabilities
   - [ ] Documentation updated if needed
4. **Approval**: Require 1 approval for non-critical changes
5. **Merge Strategy**: Squash and merge to maintain clean history

### Testing Workflow

#### Backend Testing Strategy
```bash
# Unit tests (fast, isolated)
cargo test --lib

# Integration tests (database required)
cargo test --test '*'

# End-to-end tests (full application)
cargo test --test e2e

# Test with coverage
cargo tarpaulin --out html
```

#### Frontend Testing Strategy  
```bash
# Component unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Lint and format checks
npm run lint
npm run format
```

### Deployment Process

#### Development Deployment
```bash
# Backend
cd backend && cargo run

# Frontend  
cd frontend && npm run dev
```

#### Production Build
```bash
# Backend - optimized build
cd backend && cargo build --release

# Frontend - production build
cd frontend && npm run build

# Serve static files from backend
# (Frontend build outputs to dist/, served by Axum)
```

## Documentation Structure

### Where to Find What
- **Project Overview**: `README.md` (root)
- **Development Instructions**: `CLAUDE.md` (root)
- **API Documentation**: `backend/docs/api.md` (future)
- **Architecture Decisions**: `.spec-workflow/steering/` (steering docs)
- **Feature Specifications**: `.spec-workflow/specs/[feature-name]/`
- **Database Schema**: `backend/migrations/*.sql` files
- **Frontend Components**: Inline JSDoc in component files

### How to Update Documentation
1. **Code Changes**: Update inline documentation (doc comments)
2. **Architecture Changes**: Update relevant steering documents
3. **API Changes**: Update API documentation (OpenAPI spec)
4. **Database Changes**: Create new migration files
5. **Feature Changes**: Update or create feature specifications

### Spec Organization
Feature specifications follow this structure:
```
.spec-workflow/specs/[feature-name]/
├── requirements.md     # User requirements and acceptance criteria
├── design.md          # Technical design and architecture
└── tasks.md           # Implementation task breakdown
```

### Bug Tracking Process
1. **Bug Reports**: Create GitHub issues with reproduction steps
2. **Bug Investigation**: Document findings in issue comments
3. **Bug Fixes**: Reference issue number in commit messages
4. **Testing**: Include regression tests for fixed bugs
5. **Documentation**: Update relevant docs if bug revealed gaps

## Team Conventions

### Communication Guidelines
- **Async First**: Prefer written communication over meetings
- **Context Rich**: Provide sufficient background in messages
- **Decision Records**: Document architectural decisions in ADRs
- **Code Comments**: Explain "why", not "what"
- **Issue Templates**: Use structured templates for bugs/features

### Meeting Structures
- **Sprint Planning**: Feature prioritization and task breakdown
- **Code Reviews**: Collaborative review sessions for complex changes
- **Architecture Reviews**: Design discussions for major features
- **Retrospectives**: Regular process improvement discussions

### Decision-Making Process
1. **Proposal**: Document the problem and proposed solutions
2. **Discussion**: Gather input from relevant stakeholders  
3. **Decision**: Make decision with clear rationale
4. **Documentation**: Record decision and reasoning
5. **Communication**: Share decision with affected parties

### Knowledge Sharing
- **Code Documentation**: Comprehensive inline documentation
- **Architecture Docs**: Keep steering documents up to date
- **Runbooks**: Document operational procedures
- **Onboarding Guide**: Step-by-step setup instructions
- **Tips and Tricks**: Share development workflow optimizations

## Configuration Management

### Environment Configuration
- **Development**: Local SQLite, environment variables optional
- **Production**: Environment variables for all configuration
- **Testing**: In-memory databases, mock external services
- **CI/CD**: Automated testing with GitHub Actions (future)

### Secret Management
- **Development**: `.env` files (ignored by git)
- **Production**: Environment variables or secure secret management
- **API Keys**: Never commit to repository
- **Database URLs**: Environment-specific configuration

### Feature Flags
- **Implementation**: Configuration-based feature toggles
- **Scope**: New features, experimental functionality
- **Management**: Environment variables or configuration files
- **Documentation**: Clear documentation of available flags

## Quality Assurance

### Code Quality Gates
- **Formatting**: `cargo fmt` and `prettier` must pass
- **Linting**: `cargo clippy` and `eslint` warnings addressed
- **Tests**: All tests must pass before merge
- **Type Safety**: No TypeScript `any` types, Rust warnings addressed
- **Security**: No hardcoded secrets or credentials

### Performance Monitoring
- **Backend Metrics**: Response times, database query performance
- **Frontend Metrics**: Bundle size, Core Web Vitals
- **Database Health**: Query optimization, index usage analysis
- **External API**: Rate limiting compliance, error rates

### Maintenance Procedures
- **Dependency Updates**: Regular security updates and version bumps
- **Database Maintenance**: Regular VACUUM and ANALYZE operations
- **Log Rotation**: Structured logging with appropriate retention
- **Backup Strategy**: Database backups and recovery procedures (production)
- **Security Audits**: Regular dependency vulnerability scanning