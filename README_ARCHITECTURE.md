# Coin Pusher Server Architecture

This project implements a **Server-Authoritative**, **Horizontally Scalable**, and **Secure** architecture for a Coin Pusher game.

## 1. Core Architecture

The backend is split into three microservices (using TSRPC):

1.  **Gate Server** (`src/server/gate`):
    *   Handles user authentication (Login).
    *   Manages core assets (Gold) via atomic database operations.
    *   Provides internal RPC for gold deduction/addition.
    *   **State**: Stateless (depends on MongoDB).
    *   **Scalability**: Horizontally scalable behind a Load Balancer.

2.  **Match Server** (`src/server/match`):
    *   Acts as a **Service Discovery** center for Room Servers.
    *   Handles matchmaking and load balancing (assigns players to the least loaded Room Server).
    *   Monitors Room Server health (heartbeats).
    *   **State**: In-memory (server list).
    *   **Scalability**: Single instance handles high concurrency; can be clustered if needed.

3.  **Room Server** (`src/server/room`):
    *   Hosts the **Physics Simulation** (Rapier WASM).
    *   Manages game logic and real-time state synchronization.
    *   **State**: Weak state (Physics World). Gold transactions are delegated to Gate Server.
    *   **Scalability**: **Highly scalable**. Designed for Auto-Scaling Groups (ASG).

---

## 2. Physics Simulation (Server-Side)

*   **Engine**: `@dimforge/rapier3d-compat` (WASM).
*   **Logic**: Encapsulated in `PhysicsWorld.ts`.
    *   Simulates Push Platform movement.
    *   Simulates Coin collisions and gravity.
    *   Detects "Coin Collected" and "Coin Lost" events.
*   **Loop**: Integrated into TSRPC Room ECS (`PhysicsSystem.ts`).
    *   **Tick Rate**: 30 Hz (Simulation).
    *   **Broadcast Rate**: 20 Hz (Snapshot Sync).

---

## 3. Networking & Protocols

### 3.1 Connection Flow
1.  **Client -> Gate**: `Login` -> Returns `token` + `matchUrl`.
2.  **Client -> Match**: `MatchStart` -> Returns `serverUrl` (Room Server WebSocket URL).
3.  **Client -> Room**: `Connect` -> Enters game.

### 3.2 Game Actions
*   **Drop Coin**:
    1.  Client sends `DropCoin(x)` to Room Server.
    2.  Room Server calls Gate `internal/DeductGold`.
    3.  If success, Room Server spawns a physical body in Rapier.
    4.  Room Server broadcasts `SyncPhysics` (Client reconciles local prediction).

*   **Collect Coin**:
    1.  Physics World detects coin out of bounds (win area).
    2.  Room Server calls Gate `internal/AddGold`.
    3.  Room Server broadcasts `CoinCollected` event.

---

## 4. Client Architecture (Smart Client)

*   **NetworkManager**: Manages the 3-step connection flow.
*   **RoomService**: Buffers `SyncPhysics` snapshots.
*   **PhysicsComp**:
    *   **Renderer**: Interpolates between snapshots for smooth 60 FPS rendering (100ms delay).
    *   **Prediction**: Spawns "fake" coins immediately upon tap for zero-latency feel.
    *   **Reconciliation**: Corrects fake coins based on server authority.

---

## 5. Security

*   **No Client Physics**: Client inputs are strictly inputs (X coordinate), not results.
*   **Internal RPC Auth**: Gate Server verifies `__ssoToken` for internal API calls (Coin add/deduct).
*   **Gold Authority**: All gold changes are atomic database operations on Gate Server.

## 6. Deployment & Scaling

*   **Room Server**: Can be deployed on Spot Instances (4 vCPU / 8GB RAM recommended).
*   **Capacity**: Estimated ~80-100 concurrent rooms per 4-core instance (with sleeping optimization).
*   **Cost**: Extremely cost-effective for 3000+ CCU using bare-metal or optimized cloud instances.

---

## 7. Next Steps

*   [ ] Setup **PM2 ecosystem** for production deployment.
*   [ ] Implement **Redis** for shared session storage (if Gate scales > 1).
*   [ ] Configure **Nginx** as Reverse Proxy / Load Balancer.
*   [ ] Write **Auto-Scaling scripts** based on `ReportRoomStatus` metrics.
