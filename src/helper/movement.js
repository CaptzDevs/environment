import { WORLD_CONFIG } from "../config/config";
import { randInt } from "./math";

const { WORLD_WIDTH , WORLD_HEIGHT } = WORLD_CONFIG

function lerp(start, stop, amt) {
  return start + (stop - start) * amt;
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


export function findAndSetTarget(agent, worldAgents, condition) {
  const target = findClosestTarget(agent, worldAgents, condition);

  if (target) {
    agent.targetX = target.x;
    agent.targetY = target.y;
  }

  return target;
}

/**
 * กำหนด target แบบสุ่มให้ agent
 * @param {object} agent - ตัว agent
 */
export function setRandomTarget(agent) {
  if (agent.targetX != null && agent.targetY != null) return;

  // หมุนหน้าแบบสุ่ม ±0.75 rad
  agent.facing += randInt(-0.75, 0.75, true);

  // ระยะสุ่ม
  const randomRange = agent.visibility ?? 20;
  const randomTargetX =
    agent.x + randInt(-1, 1, true) * agent.speed * randomRange;
  const randomTargetY =
    agent.y + randInt(-1, 1, true) * agent.speed * randomRange;

  // ใช้ lerp เพื่อให้การเคลื่อนที่ smooth
  agent.targetX = lerp(agent.x, randomTargetX, 0.3);
  agent.targetY = lerp(agent.y, randomTargetY, 0.3);
}


export function moveToTarget(agent, targetX, targetY, speed) {
  if (targetX == null || targetY == null) return;

  const dx = targetX - agent.x;
  const dy = targetY - agent.y;
  const desiredAngle = Math.atan2(dy, dx);

  // หมุนหน้าไป target
  let angleDiff = Math.atan2(
    Math.sin(desiredAngle - agent.facing),
    Math.cos(desiredAngle - agent.facing)
  );
  if (Math.abs(angleDiff) < agent.rotationSpeed) {
    agent.facing = desiredAngle;
  } else {
    agent.facing += angleDiff > 0 ? agent.rotationSpeed : -agent.rotationSpeed;
  }

  // move forward ตาม facing (แต่ไม่เกินระยะ target)
  const distToTarget = Math.hypot(dx, dy);
  const moveStep = Math.min(speed, distToTarget);
  agent.x += Math.cos(agent.facing) * moveStep;
  agent.y += Math.sin(agent.facing) * moveStep;

  // Keep inside canvas & bounce แบบสุ่มมุมเล็ก
  const bounceAngle = Math.PI / 6; // ±30° เด้ง
  let hitBoundary = false;
  let border = 0;

  if (agent.x < 0 + border) {
    agent.x = 0 + border;
    agent.facing =
      Math.PI - agent.facing + (Math.random() * bounceAngle - bounceAngle / 2);
    hitBoundary = true;
  }
  if (agent.x > WORLD_WIDTH - border) {
    agent.x = WORLD_WIDTH - border;
    agent.facing =
      Math.PI - agent.facing + (Math.random() * bounceAngle - bounceAngle / 2);
    hitBoundary = true;
  }
  if (agent.y < 0 + border) {
    agent.y = 0 + border;
    agent.facing =
      -agent.facing + (Math.random() * bounceAngle - bounceAngle / 2);
    hitBoundary = true;
  }
  if (agent.y > WORLD_HEIGHT - border) {
    agent.y = WORLD_HEIGHT - border;
    agent.facing =
      -agent.facing + (Math.random() * bounceAngle - bounceAngle / 2);
    hitBoundary = true;
  }

  // Clear target ถ้าเข้าใกล้ target
  const reachThreshold = speed;
  if (distToTarget < reachThreshold || hitBoundary) {
    agent.targetX = null;
    agent.targetY = null;
  }
}

export function rotateTowardsTarget(agent, targetX, targetY) {
  if (targetX === null || targetY === null) return;

  const dx = targetX - agent.x;
  const dy = targetY - agent.y;
  const desiredAngle = Math.atan2(dy, dx);

  // ---------- หมุน agent ไปทาง desiredAngle แบบจำกัดความเร็ว ----------
  let angleDiff = desiredAngle - agent.facing;
  angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)); // normalize -π → π

  if (Math.abs(angleDiff) < agent.rotationSpeed) {
    agent.facing = desiredAngle;
  } else {
    agent.facing += angleDiff > 0 ? agent.rotationSpeed : -agent.rotationSpeed;
  }
}

export const avoidAgent = () => {
  let avoidAngle = 0;
  let numAvoid = 0;
  for (const other of world.agents) {
    if (other === this || !other.isAlive || other.type !== "citizen") continue;
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < this.avoidRadius && dist > 0) {
      const angleToOther = Math.atan2(dy, dx);
      const diff = Math.atan2(
        Math.sin(angleToOther - this.facing),
        Math.cos(angleToOther - this.facing)
      );
      avoidAngle += (diff > 0 ? -1 : 1) * (this.avoidStrength / (dist + 0.1));
      numAvoid++;
    }
  }
  if (numAvoid > 0) {
    avoidAngle /= numAvoid;
    this.facing += avoidAngle;
  }
};

export function computeAvoidance(agent, world, mode = "repel") {
  let angleSum = 0;
  let count = 0;

  for (const other of world.agents) {
    if (other === agent || !other.isAlive || other.type !== "citizen") continue;

    const dx = other.x - agent.x;
    const dy = other.y - agent.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const combinedSize = agent.size + other.size;

    if (dist < agent.avoidRadius && dist > 0) {
      const angleToOther = Math.atan2(dy, dx);
      const diff = Math.atan2(
        Math.sin(angleToOther - agent.facing),
        Math.cos(angleToOther - agent.facing)
      );

      // ---------- ปรับ facing ----------
      if (mode === "repel") {
        angleSum += (diff > 0 ? -1 : 1) * (agent.avoidStrength / (dist + 0.1));
      } else if (mode === "attract") {
        angleSum += diff * (agent.avoidStrength / (dist + 0.1));
      }

      // ---------- ตรวจการชน ----------
      if (dist < combinedSize) {
        const overlap = combinedSize - dist;
        const pushFactor = 0.2; // ขยับ 20% ของ overlap ต่อ step

        // ขยับเฉพาะตัวเล็กกว่า
        if (agent.size <= other.size) {
          // เด้งออกด้วยมุมสุ่มเล็ก ±0.2 rad
          const angle = Math.atan2(dy, dx) + (Math.random() * 0.4 - 0.2);
          agent.x -= Math.cos(angle) * overlap * pushFactor;
          agent.y -= Math.sin(angle) * overlap * pushFactor;

          // ปรับ facing แบบ smooth ให้หันไปทางที่เคลื่อนที่ออก
          const desiredAngle = Math.atan2(agent.y - other.y, agent.x - other.x);
          const angleDiff = Math.atan2(
            Math.sin(desiredAngle - agent.facing),
            Math.cos(desiredAngle - agent.facing)
          );
          agent.facing += angleDiff * 0.1;
        }
      }

      count++;
    }
  }

  // ปรับ facing แบบเฉลี่ย
  if (count > 0) {
    angleSum /= count;
    agent.facing += angleSum;
  }
}

export const dropArea = (agent) => {
  const angle = Math.random() * Math.PI * 2;

  // ระยะ drop แบบ 15–30
  const dist = randInt(15, 30);

  const dropX = agent.x + Math.cos(angle) * dist;
  const dropY = agent.y + Math.sin(angle) * dist;

  // ป้องกันไม่ให้ออกนอก world
  const clampedX = Math.max(0, Math.min(dropX, WORLD_WIDTH));
  const clampedY = Math.max(0, Math.min(dropY, WORLD_HEIGHT));

  return { x: clampedX, y: clampedY };
};
