import p5 from "p5";
import { findClosestTarget } from "./movement";
import { randInt } from "./helper/math";
import { size } from "lodash";

function logJson(obj, indent = 2) {
  return JSON.stringify(obj, null, indent);
}
function lerp(start, stop, amt) {
  return start + (stop - start) * amt;
}

const WORLD_WIDTH = window.innerWidth - 20;
const WORLD_HEIGHT = window.innerHeight - 21;
const MAX_CITIZEN = 50;
let TICK = 0;
const WORLD_TICKS_PER_DAY = 100;
const TICK_SPEED = 0.5;

const GENDERS = ["male", "female"];
// ================= World Blueprint =================

// ================= Agent Blueprint =================
const Agent = {
  type: "agent",
  agentName: "Agent",
  x: WORLD_WIDTH / 2,
  y: WORLD_HEIGHT / 2,
  money: 0,
  hunger: 50,
  gender: "male",
  visibility: 100, // pixels → ระยะมองเห็น
  color: [Math.random() * 255, Math.random() * 255, Math.random() * 255], // RGB random
  step(world) {
    console.log("dasodsakod");
    this.x += Math.random() * 4 - 2;
    this.y += Math.random() * 4 - 2;
  },
  info() {
    return `${this.type} ${this.agentName} | Gender: ${this.gender} | att: ${this.attractiveness}`;
  },
};

// ================= World Rules =================
const WorldRules = {
  economy: {
    active: false,
    apply(world) {
      const citizens = world.getAgentsByType("citizen");
      const businesses = world.getAgentsByType("business");

      // ปรับราคาธุรกิจตามเงินเฉลี่ย citizen
      const avgCitizenMoney =
        citizens.length > 0
          ? citizens.reduce((sum, c) => sum + c.money, 0) / citizens.length
          : 0;

      businesses.forEach((b) => {
        if (avgCitizenMoney > 120 && Math.random() < 0.05) b.price += 1;
        if (avgCitizenMoney < 80 && Math.random() < 0.05)
          b.price = Math.max(1, b.price - 1);
      });

      // เก็บภาษี 1% จาก citizen
      citizens.forEach((c) => {
        const tax = c.money * 0.01;
        c.money -= tax;
      });
    },
  },

  population: {
    active: false,

    apply(world) {
      const agents = world.agents;

      // เกิด citizen ใหม่
      if (Math.random() < 0.01) {
        const newCitizen = createCitizen({
          agentName: "C" + Math.floor(Math.random() * 1000),
        });
        agents.push(newCitizen);
        console.log("New Citizen born:", newCitizen.agentName);
      }

      // เกิด business ใหม่
      if (Math.random() < 0.005) {
        const newBusiness = createBusiness({
          agentName: "B" + Math.floor(Math.random() * 1000),
        });
        agents.push(newBusiness);
        console.log("New Business opened:", newBusiness.agentName);
      }
    },
  },

  randomEvents: {
    active: false,
    apply(world) {
      const citizens = world.getAgentsByType("citizen");

      // โบนัส citizen
      if (Math.random() < 0.01) {
        citizens.forEach((c) => (c.money += 10));
        console.log("World Event: Citizens got a bonus!");
      }

      // Crisis
      if (Math.random() < 0.005) {
        citizens.forEach((c) => (c.money = Math.max(0, c.money - 10)));
        console.log("World Event: Citizens lost money due to crisis!");
      }
    },
  },

  boundaries: {
    active: false,
    apply(world) {
      // จำกัด agent ให้อยู่ใน canvas
      world.agents.forEach((a) => {
        a.x = Math.max(0, Math.min(WORLD_WIDTH, a.x));
        a.y = Math.max(0, Math.min(WORLD_HEIGHT, a.y));
      });
    },
  },
};

// ================= World =================
const World = {
  agents: [],
  agentsDead: [],

  maxAttractiveness: 0,
  maxSize: 0,
  // ================= Add agent =================
  addAgent(agent, amount = 1) {
    const list = [];
    for (let i = 0; i < amount; i++) {
      this.agents.push(agent);
      list.push(agent);
    }
    return list;
  },

  removeAgentsBy(condition) {
    this.agents = this.agents.filter((a) => !condition(a));
  },

  // ================= Get agents =================
  getAgentsByType(type) {
    return this.agents.filter((a) => a.type === type);
  },

  getAgentsBy(prop, value) {
    return this.agents.filter((a) => a[prop] === value);
  },

  getCitizens() {
    return this.getAgentsByType("citizen");
  },

  getBusinesses() {
    return this.getAgentsByType("business");
  },

  groupBy(prop) {
    const group = this.agents.reduce((acc, a) => {
      const key = a[prop] ?? "unknown";
      if (!acc[key]) acc[key] = 0;
      acc[key] += 1;
      return acc;
    }, {});
    return group;
  },

  // ================= World Rules =================
  applyRules() {
    if (typeof WorldRules === "undefined") return;

    for (const ruleagentName in WorldRules) {
      const rule = WorldRules[ruleagentName];
      if (rule.active && typeof rule.apply === "function") {
        // ส่ง world object ตัวนี้ให้ rule
        rule.apply(this);
      }
    }
  },

  // ================= Step World =================
  step() {
    // ให้ agent ทำงาน
    this.agents.forEach((a) => a.step(this));

    this.maxAttractiveness = Math.max(
      ...this.agents.map((a) =>
        a.isAlive && a.type === "citizen" ? a.attractiveness : 0
      )
    );

    this.maxSize = Math.max(
      ...this.agents.map((a) =>
        a.isAlive && a.type === "citizen" ? a.size : 0
      )
    );
    // Apply world rules หลัง agent ทำงาน
    this.applyRules();
  },

  // ================= Utility =================
  summary() {
    const totalMoney = this.getCitizens().reduce((sum, c) => sum + c.money, 0);
    return {
      citizens: this.getCitizens().length,
      businesses: this.getBusinesses().length,
      totalMoney,
    };
  },
  tickWorld() {
    TICK++;
    this.step();
    if (TICK % WORLD_TICKS_PER_DAY === 0) {
      console.log(`Day ${TICK / WORLD_TICKS_PER_DAY} passed`);
    }
  },
};

function randomCoolNeon() {
  const r = Math.floor(50 + Math.random() * 80); // ต่ำ → ไม่ร้อน
  const g = Math.floor(150 + Math.random() * 105); // สูง → โทนฟ้า
  const b = Math.floor(200 + Math.random() * 55); // สูงสุด → โทนน้ำเงินสว่าง
  return [r, g, b];
}

function randomWarmNeon() {
  const r = Math.floor(200 + Math.random() * 55); // แดงสูง
  const g = Math.floor(50 + Math.random() * 120); // เขียวปานกลาง → ส้ม/เหลือง
  const b = Math.floor(Math.random() * 60); // น้ำเงินต่ำ → ไม่เย็น
  return [r, g, b];
}

// Biology
// Economy

function moveToTarget(agent, targetX, targetY, speed) {
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

const avoidAgent = () => {
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

function computeAvoidance(agent, world, mode = "repel") {
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

const dropArea = (agent) => {
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
function setRandomTarget(agent) {
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

// ================= Factory Functions =================
function createCitizen(props) {
  const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];

  return {
    ...Agent,
    // Biology
    size: 8,
    age: 0,
    energy: 100,
    speed: 1,
    gender,
    reproductionCooldown: 0,
    reproductionChance: 0.001, //! unuse yet
    matingDrive: 0,
    visibility: 2500,
    color: gender === "male" ? randomCoolNeon() : randomWarmNeon(),
    isAlive: true,
    attractiveness: gender === "female" ? randInt(0, 100, true) : 0,
    children: [],

    type: "citizen",
    hunger: 50,
    eaten: 0,
    money: 100,

    // Movement
    trail: [],
    trailLength: 100,
    x: Math.random() * WORLD_WIDTH, // ±100 รอบกลาง
    y: Math.random() * WORLD_HEIGHT, // ±100 รอบกลาง
    targetX: null,
    targetY: null,
    wanderChance: 0.4,
    avoidRadius: 5,
    avoidStrength: 3, // ลดลงเพื่อหลบแบบนุ่มนวล
    facing: Math.random() * Math.PI * 2,
    rotationSpeed: 1 / 10,
    avoidType: "repel",
    ...props,

    step(world) {
      if (!this.isAlive) {
        this.eaten = 0;
        world.agentsDead.push(this);
        world.removeAgentsBy((a) => a === this);
        return;
      }

      // ---------- ลด hunger และเพิ่มอายุ ----------
      if (TICK % 50 === 0) this.hunger = Math.max(0, this.hunger - 1);

      if (this.hunger <= 0) {
        this.isAlive = false;

        for (let i = 0; i < this.eaten; i++) {
          const { x: clampedX, y: clampedY } = dropArea(this);
          world.addAgent(
            createBusiness({
              agentName: "C" + randInt(1000),
              x: clampedX,
              y: clampedY,
            })
          );
        }

        return;
      }

      if (TICK % WORLD_TICKS_PER_DAY === 0) this.age++;

      const shouldWander = Math.random() < this.wanderChance;

      // count down reproductionCooldown
      if (TICK % 50 === 0 && this.gender === "female") {
        this.reproductionCooldown = Math.max(0, this.reproductionCooldown - 2);
      }

      // ---------- หา closest target locgic ----------

      // closedBiggest
      findAndSetTarget(
        this,
        world.agents,
        (other) =>
          this.attractiveness != world.maxAttractiveness &&
          other.type === "citizen" &&
          other.isAlive &&
          other.size >= world.size
      );

      // closedBaby
      findAndSetTarget(
        this,
        world.agents,
        (other) =>
          this.gender === "female" &&
          other.age <= 5 &&
          other.type === "citizen" &&
          other.isAlive
      );

      // closestFemale with most attractiveness
      findAndSetTarget(
        this,
        world.agents,
        (other) =>
          this.matingDrive === 100 &&
          this.gender === "male" &&
          other.gender === "female" &&
          other.age >= 3 &&
          other.type === "citizen" &&
          other.isAlive &&
          other.attractiveness === world.maxAttractiveness
      );

      // closestBusiness
      findAndSetTarget(
        this,
        world.agents,
        (other) => other.type === "business"
      );

      // ---------- Wander (No target) ----------
      setRandomTarget(this);

      // ---------- หมุนหน้าไปยัง target ----------
      moveToTarget(this, this.targetX, this.targetY, this.speed);
      // ---------- Avoid other citizens ----------
      /*   if(TICK % 100 === 0){
        this.avoidType = ["repel", "attract"][randInt(0,1)];
      } */

      computeAvoidance(this, world, "repel");

      // ---------- Trail ----------
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.trailLength) this.trail.shift();

      // ---------- Business interaction ----------
      for (const ag of world.agents) {
        if (ag.type === "business") {
          const dx = ag.x - this.x;
          const dy = ag.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= this.size && !this.hasEnteredBusiness) {
            this.hasEnteredBusiness = true;
            this.lastBusiness = ag.agentName;
            this.hunger += 10;
            this.size += 1;
            this.visibility += 1;
            this.eaten += 1;
            const index = world.agents.indexOf(ag);
            world.agents.splice(index, 1);
            console.log(`${this.agentName} entered business ${ag.agentName}`);
          } else if (dist > this.size) {
            this.hasEnteredBusiness = false;
          }
        }
      }

      // Female Giving food to baby
      for (const ag of world.agents) {
        if (
          this.type === "citizen" &&
          this.age >= 5 &&
          this.gender === "female" &&
          this.eaten > 0 &&
          this != ag &&
          ag.isAlive &&
          ag.age < 5 &&
          ag.type === "citizen"
        ) {
          const dx = ag.x - this.x;
          const dy = ag.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= this.size) {
            this.eaten -= 1;
            this.hunger -= 10;
            this.visibility -= 1;
            this.size -= 1;

            ag.hunger += 10;
            ag.eaten += 1;
            ag.size += 1;
          }
        }
      }

      // Male Giving food to Most Attractive
      for (const ag of world.agents) {
        if (
          this.type === "citizen" &&
          this.age >= 5 &&
          this.gender === "male" &&
          this != ag &&
          this.eaten > 0 &&
          ag.isAlive &&
          ag.type === "citizen" &&
          ag.attractiveness >= world.maxAttractiveness
        ) {
          const dx = ag.x - this.x;
          const dy = ag.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= this.size) {
            this.eaten -= 1;
            this.hunger -= 10;
            this.visibility -= 1;
            this.size -= 1;

            ag.hunger += 10;
            ag.eaten += 1;
            ag.size += 1;
          }
        }
      }

      //ฺ Breed and produce children
      for (const ag of world.agents) {
        if (
          this.gender === "male" &&
          this.type === "citizen" &&
          ag.gender === "female" &&
          ag.isAlive &&
          ag.age >= 3 &&
          ag.type === "citizen" &&
          ag.reproductionCooldown === 0
        ) {
          const dx = ag.x - this.x;
          const dy = ag.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= this.size && this.matingDrive === 100) {
            const { x: clampedX, y: clampedY } = dropArea(ag);

            const newCitizen = world.addAgent(
              createCitizen({
                x: clampedX,
                y: clampedY,
                size: 8,
              })
            );

            ag.children = [...ag.children, ...newCitizen];
            ag.reproductionCooldown = 100;
            this.matingDrive = 0;
          }
        }
      }

      // ---------- Citizen logic ----------
      this.matingDrive += 0.5;
      this.matingDrive = Math.min(100, this.matingDrive);
      this.avoidRadius = this.size;

      /* this.avoidStrength = this.size * 0.5 */
      /* this.size = Math.min(30, this.size); */
    },
  };
}

function createBusiness(props = {}) {
  return {
    ...Agent,
    type: "business",
    money: 0,
    price: 1,
    currentAgents: 0,
    maxAgents: 1,
    x: Math.random() * WORLD_WIDTH,
    y: Math.random() * WORLD_HEIGHT,
    ...props,

    step(world) {
      // ปรับราคาแบบสุ่ม
      if (Math.random() < 0.05) {
        this.price = Math.max(1, this.price + (Math.random() > 0.5 ? 1 : -1));
      }

      // รีเซ็ต counter และเก็บรายชื่อ citizen รอบตัว
      this.currentAgents = 0;
      const agentsNearby = [];

      for (const agent of world.agents) {
        if (agent === this) continue;

        const dx = agent.x - this.x;
        const dy = agent.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= agent.size && agent.type === "citizen" && agent.isAlive) {
          this.currentAgents += 1;
          agentsNearby.push(agent);
          //console.log(agent.agentName, "near", this.agentName);
          /*   agent.hunger += 10; */
          this.money += this.price;
          /*      const index = world.agents.indexOf(this);

          world.agents.splice(index, 1); */
        }
      }

      // ตรวจสอบ maxAgents
      if (this.currentAgents >= this.maxAgents) {
        const index = world.agents.indexOf(this);
        if (index !== -1) {
          /*  world.agents.splice(index, 1); */
          console.log(
            `${
              this.agentName
            } destroyed due to overcrowding by: ${agentsNearby.join(", ")}`
          );
        }
      }
    },
  };
}

// ================= Helper =================
function getRandomBusiness(world) {
  const businesses = world.getAgentsByType("business");
  return businesses.length
    ? businesses[Math.floor(Math.random() * businesses.length)]
    : null;
}

const renderSummary = (p, arr = []) => {
  return arr.map((item, i) => p.text(item, 10, (i + 1) * 15));
};

function maintainBusinesses(world, minCount = 3) {
  const businesses = world.getAgentsByType("business");
  const missing = minCount - businesses.length;
  for (let i = 0; i < missing; i++) {
    const newB = createBusiness({
      agentName: "B" + Math.floor(Math.random() * 1000),
    });
    world.addAgent(newB);
    console.log("New business spawned:", newB.agentName);
  }
}

// ================= p5.js Sketch =================
const sketch = (p) => {
  p.setup = () => {
    p.createCanvas(WORLD_WIDTH, WORLD_HEIGHT);

    // สร้าง citizen เริ่มต้น
    for (let i = 0; i < MAX_CITIZEN; i++) {
      World.addAgent(createCitizen());
    }

    // สร้าง business เริ่มต้น

    for (let i = 0; i < 500; i++) {
      World.addAgent(
        createBusiness({
          agentName: "B" + Math.floor(Math.random() * 1000),
        })
      );
    }
  };

  p.draw = () => {
    p.background(240);

    World.tickWorld();
    /*  maintainBusinesses(
      World,
       World.getAgentsByType("citizen").filter((a) => a.type === "citizen" && a.isAlive).length*0.9 );
 */

    /*   if(TICK % (WORLD_TICKS_PER_DAY*3) === 0){
         for (let i = 0; 
      i <  World.getAgentsByType("citizen").filter((a) => a.type === "citizen" && a.isAlive).length*0.3 ;
       i++){
      World.addAgent(createBusiness({agentName : "B" + Math.floor(Math.random() * 1000)}));
    }
    } */

    let hoveredAgent = null;

    // วาด agent
    for (const a of World.agents) {
      // ใช้สีของ agent หรือ default ถ้าไม่มี
      const [r, g, b] = a.color || [100, 100, 255];

      if (a.type === "citizen" && a.isAlive) {
        // ---------- วาด trail ----------
        p.noFill();
        p.stroke(r, g, b, 150); // สี agent + โปร่งแสง
        p.strokeWeight(1); // เส้นหนา 10px
        p.beginShape();
        for (const [index, pos] of a.trail.entries()) {
          p.vertex(pos.x, pos.y);
        }
        p.endShape();

        // ---------- วาด visibility ----------
        p.noFill();
        p.stroke(r, g, b, 50); // สีโปร่งแสง
        p.strokeWeight(5); // เส้นหนา 10px
        p.circle(a.x, a.y, a.visibility);

        // ---------- วาดตัว citizen ----------
        // ---------- วาดตัว citizen ----------
        if (a.isAlive) {
          p.fill(r, g, b); // สีปกติ
        } else {
          p.fill(114, 114, 114); // สีตาย
        }

        // ถ้าเป็นตัวที่น่าดึงดูดที่สุด ให้เน้นสีและ stroke
        if (
          a.attractiveness === World.maxAttractiveness &&
          a.gender === "female"
        ) {
          p.fill(255, 141, 161);
          p.stroke(255, 125, 125);
          p.strokeWeight(5);
        } else {
          p.noStroke();
        }

        // วาดวงกลมตัว citizen
        p.circle(a.x, a.y, a.size);

        // ---------- วาด facing indicator ----------
        p.stroke(255, 255, 255, 200);
        p.strokeWeight(2);

        // Normal facing indicator
        /* const fx = a.x + Math.cos(a.facing) * (Math.max(a.size, 5) + 10);
        const fy = a.y + Math.sin(a.facing) * (Math.max(a.size, 5) + 10); */

        //  facing indicator to target
        const fx = a.targetX + Math.cos(a.facing) * Math.max(a.size, 5);
        const fy = a.targetY + Math.sin(a.facing) * Math.max(a.size, 5);

        p.line(a.x, a.y, fx, fy);
      } else if (a.type === "business") {
        // วาด business
        p.fill(200, 100, 50);

        p.noStroke();
        p.rect(a.x - 5, a.y - 5, 10, 10);
      }

      // ---------- ตรวจสอบ hover ----------
      const d = p.dist(p.mouseX, p.mouseY, a.x, a.y);
      if (d < 10) {
        hoveredAgent = a;
      }
    }

    // ================= Click to Create Business =================
    p.mousePressed = () => {
      const agentName = "B" + Math.floor(Math.random() * 1000);

      const newBusiness = createBusiness({ agentName: agentName });
      newBusiness.x = p.mouseX;
      newBusiness.y = p.mouseY;

      World.addAgent(newBusiness);

      console.log("New Business created:", agentName, "at", p.mouseX, p.mouseY);
    };

    // แสดง tooltip
    if (hoveredAgent) {
      p.fill(0);
      p.textSize(14);
      p.text(hoveredAgent.info(), p.mouseX + 10, p.mouseY + 10);
    }

    // แสดง summary
    const citizens = World.getAgentsByType("citizen");
    const citizensGender = World.groupBy("gender");
    const businesses = World.getAgentsByType("business");
    const totalMoney = citizens.reduce((sum, c) => sum + c.money, 0);
    const totalAlive = citizens.filter((c) => c.isAlive).length;
    const numMale = citizens.filter((item) => item.gender === "male").length;
    const numFemale = citizens.filter(
      (item) => item.gender === "female"
    ).length;
    p.fill(0);
    p.textSize(14);

    /*   renderSummary(p, [
      `Tick: ${TICK}`,
      `Days: ${Math.floor(TICK / WORLD_TICKS_PER_DAY)}`,
      `Citizens: ${citizens.length}`,
      `Alive: ${totalAlive}`,
      `hunger: ${citizens[0].hunger}`,
      `Businesses: ${businesses.length}`,
      `Total Money (Citizens): ${totalMoney.toFixed(0)}`,
      `Total Age AVG: ${(
        citizens.reduce((sum, c) => sum + c.age, 0) / citizens.length
      ).toFixed(2)}`,
      `Male: ${numMale}`,
      `Female: ${numFemale}`,
    ]); */

    /*  const statsDiv = document.getElementById("stats");
    statsDiv.innerHTML = `
      <h2>World Stats</h2>
      <p>Total Citizens: ${citizens.length}</p>
      <p>Alive Citizens: ${totalAlive}</p>
      <p>Male: ${numMale}</p>
      <p>Female: ${numFemale}</p>
      <p>Total Money: ${totalMoney}</p>
      <p>Total Businesses: ${businesses.length}</p>
    `; */

    updateStats();
  };
};
new p5(sketch);

let isDragging = false;
let offsetX = 0;
let offsetY = 0;

function updateStats() {
  const statsDiv = document.getElementById("stats");
  statsDiv.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - statsDiv.offsetLeft;
    offsetY = e.clientY - statsDiv.offsetTop;
    statsDiv.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    statsDiv.style.left = `${e.clientX - offsetX}px`;
    statsDiv.style.top = `${e.clientY - offsetY}px`;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
    statsDiv.style.cursor = "grab";
  });

  const citizens = World.getAgentsByType("citizen");
  const businesses = World.getAgentsByType("business");

  const totalMoney = citizens.reduce((sum, c) => sum + c.money, 0);
  const totalAlive = citizens.filter((c) => c.isAlive).length;
  const totalEat = citizens
    .filter((c) => c.isAlive)
    .reduce((sum, c) => sum + c.eaten, 0);
  const numMale = citizens.filter(
    (c) => c.gender === "male" && c.isAlive
  ).length;
  const numFemale = citizens.filter(
    (c) => c.gender === "female" && c.isAlive
  ).length;

  statsDiv.innerHTML = `
    <h2>World Stats</h2>
    <p>Days: ${Math.floor(TICK / WORLD_TICKS_PER_DAY)} (${TICK})</p>
    <p>Alive: ${totalAlive}</p>
    <p>Dead: ${World.agentsDead.length}</p>
    <p>Male: ${numMale}</p>
    <p>Female: ${numFemale}</p>
    <p>Total Eat: ${totalEat}</p>
    <p>Total Businesses: ${businesses.length}</p>
    <p>Most attractiveness: ${World.maxAttractiveness.toFixed(2)}</p>
    
  `;
}
