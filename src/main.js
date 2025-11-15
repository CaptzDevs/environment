import p5 from "p5";
import { findClosestTarget, moveToTarget } from "./movement";

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

// Biology
// Economy

// ================= Factory Functions =================
function createCitizen(name) {
  const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];

  return {
    ...Agent,
    //================ Biology ================
    size: 8,
    age: 0,
    energy: 100,
    speed: 5, // pixels per tick
    reproductionCooldown: 0,
    reproductionChance: 0.001,

    gender: GENDERS[Math.floor(Math.random() * GENDERS.length)],
    visibility: 5, // pixels
    hunger: 50,
    color: gender === "male" ? randomCoolNeon() : randomWarmNeon(),
    isAlive: true,
    attractiveness: Math.floor(Math.random() * 100),
    //================ Economy ================
    type: "citizen",
    name,
    money: 100,

    //================ Movement ================

    trail: [],
    trailLength: 100,
    targetX: null,
    targetY: null,
    wanderChance: .4,
    avoidRadius: 10,
    avoidStrength: 10,

    step(world) {
      if (!this.isAlive) return;

      // ---------- ลด hunger ----------
      if (TICK % 10 === 0) this.hunger = Math.max(0, this.hunger - 1);
      if (this.hunger <= 0) {
        this.isAlive = false;
        return;
      }
      this.age += TICK % WORLD_TICKS_PER_DAY === 0 ? 1 : 0;
      // ---------- หา closest business ----------
      const closestBusiness = findClosestTarget(
        this,
        world.agents,
        (other) => other.type === "business"
      );

      const shouldWalk = Math.random() < this.wanderChance;

      // ---------- กำหนด target ----------
      if (closestBusiness && this.hunger < 10) {
        this.targetX = closestBusiness.x ?? this.x;
        this.targetY = closestBusiness.y ?? this.y;
      } else if ((this.targetX == null || this.targetY == null) && shouldWalk) {
        const randomRange = this.visibility ?? 20;
        const randomTargetX =
          (this.x ?? 0) + (Math.random() * 2 - 1) * this.speed * randomRange;
        const randomTargetY =
          (this.y ?? 0) + (Math.random() * 2 - 1) * this.speed * randomRange;

        this.targetX = lerp(this.x ?? 0, randomTargetX, 0.3);
        this.targetY = lerp(this.y ?? 0, randomTargetY, 0.3);
      }

      // ---------- Move ----------
      moveToTarget(this, this.targetX, this.targetY, this.speed);

      // ---------- Avoid other citizens ----------
      const avoidRadius = this.avoidRadius ;
      const avoidStrength = this.avoidStrength;
      let ax = 0;
      let ay = 0;
      for (const other of world.agents) {
        if (other === this || !other.isAlive) continue;
        if (other.type !== "citizen") continue;

        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < avoidRadius && dist > 0) {
          const factor = ((avoidRadius - dist) / avoidRadius) * avoidStrength;
          ax += (dx / dist) * factor;
          ay += (dy / dist) * factor;
        }
      }
      this.x += ax;
      this.y += ay;

      // ---------- Keep inside canvas ----------
      this.x = Math.max(0, Math.min(this.x, WORLD_WIDTH));
      this.y = Math.max(0, Math.min(this.y, WORLD_HEIGHT));

      // ---------- Trail ----------
      this.trail.push({ x: this.x ?? 0, y: this.y ?? 0 });
      if (this.trail.length > this.trailLength) this.trail.shift();

      // ---------- Business interaction ----------
      for (const ag of world.agents) {
        if (ag.type === "business") {
          const dx = (ag.x ?? 0) - (this.x ?? 0);
          const dy = (ag.y ?? 0) - (this.y ?? 0);
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= 5) {
            if (!this.hasEnteredBusiness) {
              this.hasEnteredBusiness = true;
              this.lastBusiness = ag.name;

              this.hunger += 10;
              this.size += 0.5;
              this.visibility += 1 ;
              this.money += ag.price ?? 0;

              console.log(`${this.name} entered business ${ag.name}`);
            }
          } else {
            this.hasEnteredBusiness = false;
          }
        }
      }

      // ---------- Citizen logic ----------
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
    maintainBusinesses(World, 500 / Math.max((TICK / Math.max(WORLD_TICKS_PER_DAY,1)),1));

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
      `Total Age AVG: ${(citizens.reduce((sum, c) => sum + c.age, 0)/citizens.length).toFixed(2)}`,

    ]);
  };
};
new p5(sketch);
