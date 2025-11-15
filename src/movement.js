const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 600;
/**
 * Move agent towards a target smoothly
 * @param {object} agent - the agent
 * @param {number} targetX
 * @param {number} targetY
 * @param {number} speed
 */

function lerp(start, stop, amt) {
  return start + (stop - start) * amt;
}

export function moveToTarget(agent, targetX, targetY, speed) {
  if (targetX === null || targetY === null) return;

  const dx = targetX - agent.x;
  const dy = targetY - agent.y;
  const dist = Math.sqrt(dx*dx + dy*dy) || 0.0001;
  const moveDist = Math.min(dist, speed);

  agent.x += (dx / dist) * moveDist;
  agent.y += (dy / dist) * moveDist;

  // ---------- Keep inside canvas ----------
  let hitBoundary = false;
  if (agent.x < 0) { agent.x = 0; hitBoundary = true; }
  if (agent.x > WORLD_WIDTH) { agent.x = WORLD_WIDTH; hitBoundary = true; }
  if (agent.y < 0) { agent.y = 0; hitBoundary = true; }
  if (agent.y > WORLD_HEIGHT) { agent.y = WORLD_HEIGHT; hitBoundary = true; }

  // ถ้าเกือบถึง target หรือชนขอบ → clear target
  if (Math.abs(agent.x - targetX) < 1 && Math.abs(agent.y - targetY) < 1) {
    agent.targetX = null;
    agent.targetY = null;
  }

  if (hitBoundary) {
    // รีเซ็ต target ใหม่เมื่อชนขอบ
    agent.targetX = null;
    agent.targetY = null;
  }
}


/**
 * Find the closest agent matching condition within visibility
 * @param {object} agent - the agent
 * @param {Array} worldAgents - list of all agents in world
 * @param {function} condition - filter function (other => true/false)
 * @returns closest target or null
 */
export function findClosestTarget(agent, worldAgents, condition) {
  let closestTarget = null;
  let closestDist = agent.visibility ?? 100;

  for (const other of worldAgents) {
    if (other === agent) continue;
    if (!condition(other)) continue;

    const dx = other.x - agent.x;
    const dy = other.y - agent.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist <= closestDist) {
      closestDist = dist;
      closestTarget = other;
    }
  }

  return closestTarget;
}
