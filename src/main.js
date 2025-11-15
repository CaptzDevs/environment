import p5 from "p5";
import { findClosestTarget } from "./movement";

function logJson(obj, indent = 2) {
  return JSON.stringify(obj, null, indent);
}
function lerp(start, stop, amt) {
  return start + (stop - start) * amt;
}

const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 600;
const MAX_CITIZEN = 2;
let TICK = 0;
const WORLD_TICKS_PER_DAY = 100;
const TICK_SPEED = 0.5;

const GENDERS = ["male", "female"];
// ================= World Blueprint =================

// ================= Agent Blueprint =================
const Agent = {
  type: "agent",
  name: "Agent",
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
    return `${this.type} ${this.name} | Money: ${this.money} | hunger: ${this.hunger}`;
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
        const newCitizen = createCitizen(
          "C" + Math.floor(Math.random() * 1000)
        );
        agents.push(newCitizen);
        console.log("New Citizen born:", newCitizen.name);
      }

      // เกิด business ใหม่
      if (Math.random() < 0.005) {
        const newBusiness = createBusiness(
          "B" + Math.floor(Math.random() * 1000),
          10
        );
        agents.push(newBusiness);
        console.log("New Business opened:", newBusiness.name);
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

  // ================= Add agent =================
  addAgent(agent) {
    this.agents.push(agent);
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

    for (const ruleName in WorldRules) {
      const rule = WorldRules[ruleName];
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

function rotateTowards(agent, targetX, targetY) {
  const dx = targetX - agent.x;
  const dy = targetY - agent.y;
  const desiredAngle = Math.atan2(dy, dx);

  let diff = desiredAngle - agent.facing;

  // ทำให้หมุนทางสั้นที่สุด (normalize -π ถึง π)
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));

  // จำกัดความเร็วหมุน
  const maxTurn = agent.rotationSpeed;
  if (Math.abs(diff) <= maxTurn) {
    agent.facing = desiredAngle;
  } else {
    agent.facing += Math.sign(diff) * maxTurn;
  }
}

function moveForward(agent) {
  agent.x += Math.cos(agent.facing) * agent.speed;
  agent.y += Math.sin(agent.facing) * agent.speed;
}

export function moveToTarget(agent, targetX, targetY, speed) {
  if (targetX === null || targetY === null) return;

  // 1) คำนวณ angle ที่ควรหันไปหา target
  const dx = targetX - agent.x;
  const dy = targetY - agent.y;
  const desiredAngle = Math.atan2(dy, dx);

  // 2) หมุนเอาเฉพาะ angle (ไม่เดิน)
  let diff = desiredAngle - agent.facing;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // normalize

  const maxTurn = agent.rotationSpeed;
  if (Math.abs(diff) < maxTurn) {
    agent.facing = desiredAngle;
  } else {
    agent.facing += Math.sign(diff) * maxTurn;
  }

  // 3) ถ้ายังหันไม่ตรงพอ → ไม่เดิน
  if (Math.abs(diff) > 0.2) return;

  // 4) เดินแบบ linear แต่เดินไปตาม speed ที่กำหนด
  const dist = Math.sqrt(dx * dx + dy * dy);
  const moveDist = Math.min(dist, speed);

  agent.x += (dx / dist) * moveDist;
  agent.y += (dy / dist) * moveDist;

  // 5) ขอบจอ
  let hitBoundary = false;
  if (agent.x < 0) { agent.x = 0; hitBoundary = true; }
  if (agent.x > WORLD_WIDTH) { agent.x = WORLD_WIDTH; hitBoundary = true; }
  if (agent.y < 0) { agent.y = 0; hitBoundary = true; }
  if (agent.y > WORLD_HEIGHT) { agent.y = WORLD_HEIGHT; hitBoundary = true; }

  // 6) เคลียร์ target เมื่อถึงจุดหรือชนขอบ
  if (dist < 1 || hitBoundary) {
    agent.targetX = null;
    agent.targetY = null;
  }
}


// ================= Factory Functions =================
function createCitizen(name) {
  const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];

  return {
    ...Agent,
    //================ Biology ================
    size: 10,
    age: 0,
    energy: 100,
    speed: 10, // pixels per tick
    reproductionCooldown: 0,
    reproductionChance: 0.001,

    gender: GENDERS[Math.floor(Math.random() * GENDERS.length)],
    visibility: 105, // pixels
    hunger: 50,
    color: gender === "male" ? randomCoolNeon() : randomWarmNeon(),
    isAlive: true,
    attractiveness: Math.floor(Math.random() * 100),
    targetFacing: null,

    //================ Economy ================
    type: "citizen",
    name,
    money: 100,

    //================ Movement ================

    trail: [],
    trailLength: 100,
    targetX: null,
    targetY: null,
    wanderChance: 0.4,
    avoidRadius: 10,
    avoidStrength: 10,

    facing: Math.random() * Math.PI * 2, // หันสุ่มรอบตัว
    rotationSpeed: 0.1, // 0.1 rad/tick = ประมาณ 6°/tick

    step(world) {
      if (!this.isAlive) return;

      // ---------- Hunger ----------
      if (TICK % 10 === 0) this.hunger = Math.max(0, this.hunger - 1);
      if (this.hunger <= 0) {
        this.isAlive = false;
        return;
      }

      // ---------- Aging ----------
      if (TICK % WORLD_TICKS_PER_DAY === 0) this.age++;

      // ---------- Try find business ----------
      const closestBusiness = findClosestTarget(
        this,
        world.agents,
        (other) => other.type === "business"
      );

      const shouldWander = Math.random() < this.wanderChance;

      // ---------- Decide Target ----------
      if (closestBusiness && this.hunger < 80) {
        this.targetX = closestBusiness.x;
        this.targetY = closestBusiness.y;
      } else if (
        (this.targetX == null || this.targetY == null) &&
        shouldWander
      ) {
        const range = this.visibility;
        const randX = this.x + (Math.random() * 2 - 1) * this.speed * range;
        const randY = this.y + (Math.random() * 2 - 1) * this.speed * range;

        this.targetX = lerp(this.x, randX, 0.3);
        this.targetY = lerp(this.y, randY, 0.3);
      }

      // ---------- Move (Rotation Based) ----------
    if (this.targetX != null && this.targetY != null) {
  rotateTowards(this, this.targetX, this.targetY);

  const dx = this.targetX - this.x;
  const dy = this.targetY - this.y;
  const desiredAngle = Math.atan2(dy, dx);

  let diff = desiredAngle - this.facing;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));

  if (Math.abs(diff) < 0.3) {
    moveForward(this);
  }

  if (Math.hypot(dx, dy) < 2) {
    this.targetX = null;
    this.targetY = null;
  }
}

      // ---------- Avoid Other Citizens ----------
      let ax = 0;
      let ay = 0;
      for (const other of world.agents) {
        if (other === this || !other.isAlive) continue;
        if (other.type !== "citizen") continue;

        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.avoidRadius && dist > 0) {
          const factor =
            ((this.avoidRadius - dist) / this.avoidRadius) * this.avoidStrength;
          ax += (dx / dist) * factor;
          ay += (dy / dist) * factor;
        }
      }
      this.x += ax;
      this.y += ay;

      // ---------- Keep inside canvas (margin 10) ----------
      this.x = Math.max(10, Math.min(this.x, WORLD_WIDTH - 10));
      this.y = Math.max(10, Math.min(this.y, WORLD_HEIGHT - 10));

      // ---------- Trail ----------
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.trailLength) this.trail.shift();

      // ---------- Business Interaction ----------
      for (const ag of world.agents) {
        if (ag.type !== "business") continue;

        const dx = ag.x - this.x;
        const dy = ag.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 6) {
          if (!this.hasEnteredBusiness) {
            this.hasEnteredBusiness = true;
            this.lastBusiness = ag.name;

            this.hunger += 10;
            this.size += 0.4;
            this.visibility += 1;
            this.money += ag.price;

            console.log(`${this.name} entered business ${ag.name}`);
          }
        } else {
          this.hasEnteredBusiness = false;
        }
      }

      // ---------- Passive Citizen Logic ----------
      this.money += 1;
      this.hunger += Math.random() > 0.5 ? 1 : -1;
    },
  };
}

function createBusiness(name, price = 5, maxAgents = 1) {
  return {
    ...Agent,
    type: "business",
    name,
    money: 0,
    price,
    maxAgents,
    currentAgents: 0,
    x: Math.random() * WORLD_WIDTH,
    y: Math.random() * WORLD_HEIGHT,

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

        if (dist <= 5 && agent.type === "citizen") {
          this.currentAgents += 1;
          agentsNearby.push(agent.name);
          //console.log(agent.name, "near", this.name);
          /*   agent.hunger += 10; */
          this.money += this.price;
        }
      }

      // ตรวจสอบ maxAgents
      if (this.currentAgents >= this.maxAgents) {
        const index = world.agents.indexOf(this);
        if (index !== -1) {
          world.agents.splice(index, 1);
          console.log(
            `${this.name} destroyed due to overcrowding by: ${agentsNearby.join(
              ", "
            )}`
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
    const newB = createBusiness(
      "B" + Math.floor(Math.random() * 1000),
      Math.floor(Math.random() * 20 + 5)
    );
    world.addAgent(newB);
    console.log("New business spawned:", newB.name);
  }
}

// ================= p5.js Sketch =================
const sketch = (p) => {
  p.setup = () => {
    p.createCanvas(WORLD_WIDTH, WORLD_HEIGHT);

    // สร้าง citizen เริ่มต้น
    for (let i = 0; i < MAX_CITIZEN; i++) {
      World.addAgent(createCitizen("C" + i));
    }

    // สร้าง business เริ่มต้น
  };

  p.draw = () => {
    p.background(240);

    World.tickWorld();
    maintainBusinesses(
      World,
      500 / Math.max(TICK / Math.max(WORLD_TICKS_PER_DAY, 1), 1)
    );

    let hoveredAgent = null;

    // วาด agent
    for (const a of World.agents) {
      // ใช้สีของ agent หรือ default ถ้าไม่มี
      const [r, g, b] = a.color || [100, 100, 255];

      if (a.type === "citizen") {
        // ---------- วาด trail ----------
        p.noFill();
        p.stroke(r, g, b, 150); // สี agent + โปร่งแสง
        p.strokeWeight(1); // เส้นหนา 10px
        p.beginShape();
        for (const pos of a.trail) {
          p.vertex(pos.x, pos.y);
        }
        p.endShape();

        // ---------- วาด visibility ----------
        p.noFill();
        p.stroke(r, g, b, 50); // สีโปร่งแสง
        p.strokeWeight(5); // เส้นหนา 10px
        p.circle(a.x, a.y, a.visibility);

        // ---------- วาดตัว citizen ----------
        a.isAlive === true ? p.fill(r, g, b) : p.fill(114, 114, 114); // สี agent + โปร่งแสง

        p.noStroke();
        p.circle(a.x, a.y, a.size);

        // ---------- วาด facing indicator ----------
p.stroke(255, 255, 255, 200);
p.strokeWeight(2);

const fx = a.x + Math.cos(a.facing) * (a.size + 10); // จุดปลาย
const fy = a.y + Math.sin(a.facing) * (a.size + 10);

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
      const name = "B" + Math.floor(Math.random() * 1000);
      const price = Math.floor(Math.random() * 20 + 5);

      const newBusiness = createBusiness(name, price);
      newBusiness.x = p.mouseX;
      newBusiness.y = p.mouseY;

      World.addAgent(newBusiness);

      console.log("New Business created:", name, "at", p.mouseX, p.mouseY);
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

    p.fill(0);
    p.textSize(14);

    renderSummary(p, [
      `Tick: ${TICK}`,
      `Days: ${Math.floor(TICK / WORLD_TICKS_PER_DAY)}`,
      `Citizens: ${citizens.length}`,
      `Alive: ${totalAlive}`,
      `hunger: ${citizens[0].hunger}`,
      `Businesses: ${businesses.length}`,
      `Total Money (Citizens): ${totalMoney.toFixed(0)}`,
      `Gender: ${logJson(citizensGender)}`,
      `Total Age AVG: ${(
        citizens.reduce((sum, c) => sum + c.age, 0) / citizens.length
      ).toFixed(2)}`,
    ]);
  };
};
new p5(sketch);
