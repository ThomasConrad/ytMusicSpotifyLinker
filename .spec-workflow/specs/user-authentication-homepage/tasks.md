# Implementation Plan

## Task Overview

This implementation plan transforms the user authentication and homepage design into 14 atomic commits, each with a single focused responsibility. The backend-first approach ensures all API endpoints are implemented and tested before corresponding frontend integration.

Each task specifies exact files to create/modify, leverages existing codebase patterns, and builds incrementally toward the complete authentication and dashboard system.

## Tasks

### Phase 1: Backend API Foundation (4 commits)

- [x] 1. Add JSON authentication endpoints to existing auth system
  - File: backend/src/api/auth.rs (modify existing)
  - Add JSON login/register/logout endpoints alongside existing HTML forms
  - Create DTOs for request/response serialization 
  - Maintain backward compatibility with existing session system
  - _Requirements: 1.1, 1.2, 1.3, 1.5_
  - _Leverage: backend/src/users/models.rs, existing AuthSession handling_

- [x] 2. Create user profile API endpoints
  - File: backend/src/api/users.rs (new)
  - File: backend/src/api/router.rs (modify to add users routes)
  - Implement GET/PUT profile endpoints with JSON responses
  - Add service connection status endpoints
  - Integrate with existing user repository and auth middleware
  - _Requirements: 2.1, 2.2, 2.3, 4.1_
  - _Leverage: backend/src/users/repository.rs, backend/src/api/protected.rs auth patterns_

- [x] 3. Enhance watcher API with dashboard data endpoints
  - File: backend/src/api/protected.rs (modify existing)
  - Add enhanced watcher list endpoint with status summaries
  - Add watcher history and statistics endpoints
  - Create comprehensive DTOs for dashboard data responses
  - _Requirements: 3.1, 3.2, 4.2, 6.1_
  - _Leverage: backend/src/users/models.rs (Watcher, SyncOperation), existing watcher repository_

- [x] 4. Create service layer for business logic separation
  - File: backend/src/users/service.rs (new)
  - File: backend/src/users/mod.rs (modify to export service)
  - Implement AuthService and UserService with business logic
  - Move complex operations from API handlers to service layer
  - Add comprehensive error handling and logging
  - _Requirements: 1.1, 2.1, 3.1, 8.1_
  - _Leverage: backend/src/users/repository.rs, backend/src/users/database.rs patterns_

### Phase 2: Frontend Authentication Integration (3 commits)

- [x] 5. Create authentication context and API client
  - File: frontend/src/contexts/AuthContext.tsx (new)
  - File: frontend/src/services/authApi.ts (new)
  - File: frontend/src/services/apiClient.ts (new - shared HTTP client)
  - Implement session-based authentication state management
  - Create API client with error handling and automatic retries
  - _Requirements: 5.1, 5.2, 8.2_
  - _Leverage: frontend/src/contexts/ThemeContext.tsx patterns_

- [x] 6. Update login page with JSON API integration
  - File: frontend/src/pages/Login.tsx (modify existing)
  - File: frontend/src/App.tsx (modify to add AuthContext provider)
  - Replace localStorage token approach with session-based auth
  - Integrate with new AuthContext and JSON API endpoints
  - Maintain existing UI styling and animations
  - _Requirements: 5.1, 5.3, 8.3_
  - _Leverage: existing form handling, error display, navigation patterns_

- [x] 7. Add session-based route protection system
  - File: frontend/src/components/auth/ProtectedRoute.tsx (new)
  - File: frontend/src/App.tsx (modify to add route guards)
  - Create route guards that check session validity via API
  - Handle session expiration with graceful redirects
  - Add loading states during authentication checks
  - _Requirements: 3.3, 3.4, 5.4_
  - _Leverage: frontend/src/@solidjs/router patterns, existing navigation_

### Phase 3: Dashboard Implementation (4 commits)

- [x] 8. Create user and watcher API clients
  - File: frontend/src/services/userApi.ts (new)
  - File: frontend/src/services/watcherApi.ts (new)
  - Implement complete CRUD operations for user profile and watchers
  - Add service connection management API calls
  - Create comprehensive TypeScript interfaces for all API responses
  - _Requirements: 4.1, 4.2, 6.2_
  - _Leverage: frontend/src/services/authApi.ts patterns, shared HTTP client_

- [x] 9. Build dashboard data loading and error handling
  - File: frontend/src/pages/Dashboard.tsx (modify existing)
  - File: frontend/src/contexts/UserContext.tsx (new - for profile data)
  - Replace placeholder user data loading with actual API integration
  - Implement comprehensive error handling with retry mechanisms
  - Add progressive loading states for better user experience
  - _Requirements: 6.1, 6.2, 8.2, 8.4_
  - _Leverage: existing loading spinner, error display patterns_

- [x] 10. Implement dashboard UI components for user profile
  - File: frontend/src/components/dashboard/UserProfile.tsx (new)
  - File: frontend/src/components/dashboard/ServiceConnections.tsx (new)
  - File: frontend/src/components/dashboard/DashboardStats.tsx (new)
  - Create reusable components for user profile display and service status
  - Add service connection/disconnection functionality
  - Follow existing component patterns and Tailwind styling
  - _Requirements: 4.1, 5.1, 5.2_
  - _Leverage: frontend/src/components/ThemeToggle.tsx styling patterns_

- [x] 11. Add watcher overview and status display
  - File: frontend/src/components/dashboard/WatcherOverview.tsx (new)
  - File: frontend/src/components/watchers/WatcherCard.tsx (new)
  - File: frontend/src/components/watchers/WatcherStatus.tsx (new)
  - Display watcher cards with status, last sync info, and quick actions
  - Add real-time status updates and sync progress indicators
  - Create empty state UI for users with no watchers configured
  - _Requirements: 4.2, 4.4, 6.3_
  - _Leverage: frontend/src/pages/Dashboard.tsx card layout patterns_

### Phase 4: Enhanced Watcher Features (3 commits)

- [x] 12. Implement watcher creation and editing forms
  - File: frontend/src/components/watchers/WatcherForm.tsx (new)
  - File: frontend/src/components/watchers/WatcherModal.tsx (new)
  - File: frontend/src/pages/Dashboard.tsx (modify to integrate forms)
  - Create comprehensive forms for watcher configuration
  - Add form validation with real-time feedback
  - Implement modal-based workflow for creating/editing watchers
  - _Requirements: 4.3, 4.4, 8.4_
  - _Leverage: frontend/src/pages/Login.tsx form patterns, validation approaches_

- [x] 13. Add sync history and activity timeline
  - File: frontend/src/components/dashboard/SyncHistory.tsx (new)
  - File: frontend/src/components/watchers/SyncActivityItem.tsx (new)
  - File: frontend/src/pages/Dashboard.tsx (modify to include sync history)
  - Display paginated sync operation history with filtering
  - Show detailed sync results with success/failure breakdowns
  - Add timeline view of recent synchronization activity
  - _Requirements: 6.1, 6.2, 6.4_
  - _Leverage: existing list/card display patterns, loading states_

- [x] 14. Implement sync preview functionality
  - File: frontend/src/components/watchers/SyncPreview.tsx (new)
  - File: frontend/src/components/watchers/SongMatchDisplay.tsx (new)
  - File: frontend/src/components/watchers/WatcherCard.tsx (modify to add preview button)
  - Create preview modal showing proposed playlist changes
  - Display song matching results with failure explanations
  - Add confirmation workflow for executing sync operations
  - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - _Leverage: modal patterns from watcher forms, existing API integration_

## Implementation Notes

### Backend Development Workflow
Each backend task should be implemented with:
1. **API Endpoint Implementation**: Complete request/response handling
2. **Unit Tests**: Test business logic and edge cases  
3. **Integration Tests**: Test complete API request/response cycles
4. **Manual Testing**: Verify endpoints work via curl or API client
5. **Documentation**: Update API documentation with new endpoints

### Frontend Development Workflow  
Each frontend task should be implemented with:
1. **Component Development**: Build isolated, testable components
2. **API Integration**: Connect components to backend endpoints
3. **Error Handling**: Implement comprehensive error states
4. **Loading States**: Add appropriate loading indicators
5. **Manual Testing**: Verify complete user workflows

### Testing Strategy
- **Backend**: All new endpoints covered by unit and integration tests
- **Frontend**: Component testing for key user interactions
- **End-to-End**: Critical authentication and dashboard workflows tested
- **Error Scenarios**: Test network failures, authentication errors, API timeouts

### Commit Messages
Follow conventional commit format:
- `feat(auth): add JSON login endpoint to auth API`
- `feat(dashboard): implement watcher overview components`  
- `fix(auth): handle session expiration in protected routes`
- `test(watcher): add integration tests for watcher API`

### Dependencies and Prerequisites
- **Backend**: No new dependencies required, uses existing Rust/Axum stack
- **Frontend**: No new dependencies required, uses existing SolidJS/Tailwind stack
- **Database**: Uses existing SQLite schema, no migrations needed
- **Development**: Follow existing development workflow from CLAUDE.md