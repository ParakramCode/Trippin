# Final Journey System Architecture

## 1. Core Entities

### JourneySource (Immutable Template)
A `JourneySource` is a static, author-owned template. It serves as the blueprint for user journeys.
*   **Mutability**: **Strictly Immutable**. Deeply frozen in development environment.
*   **Ownership**: Author/Platform.
*   **Identity**: Defined by `id`.
*   **Usage**: purely for discovery and inspection.

### JourneyFork (Mutable Instance)
A `JourneyFork` is a user-owned instance created from a `JourneySource`. It encapsulates all user-specific state.
*   **Mutability**: **Mutable** (User state only).
*   **Ownership**: User.
*   **Identity**: Defined by `id`, `sourceJourneyId`, and `clonedAt`.
*   **State**: Contains `UserStop` objects (visited status, notes) and lifecycle status (`PLANNED`, `LIVE`, `COMPLETED`).

---

## 2. Context References

### activeJourney (Mutation-Only)
The exclusive target for all write operations.
*   **Type Constraint**: MUST be a `JourneyFork`.
*   **Role**: variable holding the journey currently being edited or navigated.
*   **Contract**: 
    *   If `activeJourney` is set, the application is in an editable/navigable state.
    *   **NEVER** assign a `JourneySource` to `activeJourney`.

### inspectionJourney (Read-Only)
The exclusive target for safe viewing and discovery.
*   **Type Constraint**: `Readonly<Journey>`.
*   **Role**: variable holding a journey for previewing without risk of side effects.
*   **Contract**:
    *   Modifications to properties on this object are strictly forbidden at compile-time and run-time.
    *   Can hold either a `JourneySource` OR a `JourneyFork` (in read-only preview).

### currentJourney (Render-Only)
The unified reference for UI rendering components (Map, List, Drawer).
*   **Definition**: `inspectionJourney || activeJourney`.
*   **Role**: purely for display logic.
*   **Contract**:
    *   Components utilizing `currentJourney` must **never** attempt mutations.
    *   Priority is always given to `inspectionJourney` if present.

---

## 3. Derived State

### journeyMode
The single source of truth for the application's functional state.
*   **Values**:
    *   `INSPECTION`: User is browsing/previewing. (`inspectionJourney` is present).
    *   `PLANNING`: User is editing a planned fork. (`activeJourney` is present, status is `PLANNED`).
    *   `NAVIGATION`: User is actively executing the journey. (`activeJourney` is present, status is `LIVE`).
    *   `COMPLETED`: Journey is finished. (`activeJourney` is present, isCompleted is `true`).
*   **Contract**:
    *   Derivation logic replaces all ad-hoc flag checks (`isFollowing`, `isCompleted`).
    *   UI components must switch behavior based solely on `journeyMode`.

---

## 4. Non-Negotiable Rules

1.  **Immutable Sources**: A `JourneySource` must **NEVER** be mutated. Any attempt to change a template property is a violation of the architecture.
2.  **Fork-First Mutation**: Users generally cannot edit a journey without forking it first. Mutations (Notes, Visit Status) are legally valid **only** on `JourneyFork` entities.
3.  **Strict Reference Separation**:
    *   `inspectionJourney` is for **READING**.
    *   `activeJourney` is for **WRITING**.
    *   Never mix these concerns.
4.  **View Consistency**: The map and list views must always render `currentJourney` to ensure the user sees exactly what is selected, regardless of mode.
5.  **New Feature Compliance**: Any new feature added to the system MUST explicitly categorize its interaction as either **Inspection** (Read) or **Mutation** (Write) and use the corresponding reference (`inspectionJourney` or `activeJourney`).
