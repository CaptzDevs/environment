import p5 from "p5";
import {
  computeAvoidance,
  dropArea,
  findAndSetTarget,
  findClosestTarget,
  fleeAgent,
  moveToTarget,
  randomDropArea,
  setRandomTarget,
} from "./helper/movement";
import { randInt } from "./helper/math";
import { size, words } from "lodash";
import { Behavior } from "./behavior/behavior";
import { WORLD_CONFIG } from "./config/config";

export function logJson(obj, indent = 2) {
  return JSON.stringify(obj, null, indent);
}

const { WORLD_WIDTH, WORLD_HEIGHT } = WORLD_CONFIG;
const MAX_CITIZEN = 50;
let TICK = 0;
const WORLD_TICKS_PER_DAY = 100;
const TICK_SPEED = 0.5;

const GENDERS = ["male", "female"];

const VISUAL_SETTING = {
  trail: false,
  visibility: false,
  trailLength: 100,
  trailAlpha: 0.1,
  trailColor: [255, 255, 255],
  facingSensor: true,
  facingSensorColor: [255, 0, 0],
};
// ================= World Blueprint =================
const Logs = {
  maxSize: 50,
  logs: [],

  addLog(log) {
    this.logs.push(log);

    // ถ้าเกิน maxSize ให้ลบ log เก่าออก
    if (this.logs.length > this.maxSize) {
      this.logs.shift(); // ลบตัวแรก (เก่า)
    }
  },
};
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
    return `${this.type} ${this.agentName} | Gender: ${this.gender} | att: ${this.reproductionCooldown}`;
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
  tick: 0,
  worldTicksPerDay: 100,

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
    this.tick++;
    this.step();
    if (this.tick % this.worldTicksPerDay === 0) {
      console.log(`Day ${this.tick / this.worldTicksPerDay} passed`);
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
export function createCitizen(props) {
  const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];

  return {
    ...Agent,
    // Biology
    size: 8,
    age: 0,
    energy: 100,
    speed: 2,
    gender,
    reproductionCooldown: 100,
    reproductionChance: 0.5,
    matingDrive: 0, // ความอยากที่จะผสมพันธุ์
    visibility: 100,
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
      // ---------- Passive ----------
      this.matingDrive += 0.5;
      this.matingDrive = Math.min(100, this.matingDrive);
      this.avoidRadius = this.size;

      if (!this.isAlive) {
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
        this.eaten = 0;
        world.agentsDead.push(this);
        world.removeAgentsBy((a) => a === this);
        return;
      }

      // Death
      if (this.hunger <= 0) {
        this.isAlive = false;
        return;
      }

      /*   if(this.attractiveness === world.maxAttractiveness && this.gender === 'female'){
        this.size = 100
        this.hunger = 100
      } */
      // hunger decay
      Behavior.passive.agent.hungerDecay(world, this);
      // ReproductionCooldown
      Behavior.passive.agent.reproductionCooldown(world, this);
      // Age up
      Behavior.passive.agent.ageUp(world, this);

      // Worder
      const shouldWander = Math.random() < this.wanderChance;

      /* ===================================================== */

      // ---------- หา closest target locgic ----------

      setRandomTarget(this);
      // closedBiggest
      Behavior.target.agent.biggest(world, this);

      // closedBaby
      Behavior.target.agent.baby(world, this);

      // closestFemale with most attractiveness
      Behavior.target.agent.femaleWithMostAttractiveness(world, this);
      // closestMale to fight
      Behavior.target.agent.goFight(world, this);
      // closestBusiness
      Behavior.target.resource.food(world, this);

      const threat = findClosestTarget(this, world.agents, (other) => {
        // เงื่อนไขให้ถือเป็น threat
        return (
          this.gender === "male" &&
          other.gender === "male" &&
          other.matingDrive === 100 &&
          other.age >= 5 &&
          other.type === "citizen" &&
          other.isAlive &&
          other.size > this.size
        );
      });

      const SAFE_DISTANCE = 80;
      if (threat) {
        const dx = threat.x - this.x;
        const dy = threat.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= SAFE_DISTANCE) {
          fleeAgent(this, threat); // หนีจาก threat
        } else {
          moveToTarget(this, this.targetX, this.targetY, this.speed);
        }
      } else {
        moveToTarget(this, this.targetX, this.targetY, this.speed);
      }
      // ---------- Wander (No target) ----------

      // ---------- หมุนหน้าไปยัง target ----------
      // ---------- Avoid other citizens ----------
      /*   if(TICK % 100 === 0){
        this.avoidType = ["repel", "attract"][randInt(0,1)];
      } */

      computeAvoidance(this, world, "repel");

      // ---------- Trail ----------
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.trailLength) this.trail.shift();

      for (const ag of world.agents) {
        if (ag === this) continue;

        const dx = ag.x - this.x;
        const dy = ag.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Eat
        Behavior.action.resource.eat(world, this, ag, dist);
        // Female Giving food to baby
        Behavior.action.resource.giveFoodToBaby(world, this, ag, dist);
        // Male Giving food to Most Attractive
        Behavior.action.resource.giveFoodToFemaleWithMostAttractive(
          world,
          this,
          ag,
          dist
        );
        //ฺ Breed and produce children
        Behavior.action.resource.breeding(world, this, ag, dist);

        Behavior.action.resource.attack(world, this, ag, dist);
      }

      /* this.avoidStrength = this.size * 0.5 */
      /* this.size = Math.min(30, this.size); */
    },
  };
}

export function createBusiness(props = {}) {
  return {
    ...Agent,
    type: "business",
    money: 0,
    price: 1,
    currentAgents: 0,
    maxAgents: 1,

    size: 8,
    speed: 0.5,
    gender: "male",
    visibility: 100,

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
    rotationSpeed: 1,
    ...props,

    step(world) {
      // ปรับราคาแบบสุ่ม
      if (Math.random() < 0.05) {
        this.price = Math.max(1, this.price + (Math.random() > 0.5 ? 1 : -1));
      }

      const threat = findClosestTarget(this, world.agents, (other) => {
        // เงื่อนไขให้ถือเป็น threat
        return other.type === "citizen" && other.isAlive;
      });

      if (threat) {
        fleeAgent(this, threat);
      } else {
        setRandomTarget(this);
        moveToTarget(this, this.targetX, this.targetY, this.speed);
      }
      // ---------- หมุนหน้าไปยัง target ----------
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

let img;
let img2;

let maskedImg;
async function preload(p) {
  img = await p.loadImage(
    "/public/588002060_18551522035038884_7988235702011641822_n-removebg-preview.png"
  );

  img2 = await p.loadImage("/public/744165701522693-removebg-preview.png");
}
// ================= p5.js Sketch =================
const sketch = (p) => {
  preload(p);

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
    if (World.tick % (World.worldTicksPerDay * 50) === 0) {
      const numClusters = 5; // กำหนดจำนวนกลุ่ม
      const clusterSize = 5; // จำนวนตัวต่อกลุ่ม
      const clusterRadius = 30;

      for (let c = 0; c < numClusters; c++) {
        // จุดศูนย์กลางของกลุ่ม
        const centerX = randInt(0, WORLD_WIDTH);
        const centerY = randInt(0, WORLD_HEIGHT);

        for (let i = 0; i < clusterSize; i++) {
          // วางรอบ ๆ ศูนย์กลางเล็กน้อย
          const x = centerX + randInt(-clusterRadius, clusterRadius);
          const y = centerY + randInt(-clusterRadius, clusterRadius);

          const { x: clampedX, y: clampedY } = randomDropArea(x, y);

          World.addAgent(
            createBusiness({
              agentName: "B" + Math.floor(Math.random() * 1000),
              x: clampedX,
              y: clampedY,
            })
          );
        }
      }
    }

    let hoveredAgent = null;

    // วาด agent
    for (const a of World.agents) {
      // ใช้สีของ agent หรือ default ถ้าไม่มี
      const [r, g, b] = a.color || [100, 100, 255];

      if (a.type === "citizen" && a.isAlive) {
        // ---------- วาด trail ----------
        if (VISUAL_SETTING.trail) {
          p.noFill();
          p.stroke(r, g, b, 150); // สี agent + โปร่งแสง
          p.strokeWeight(1); // เส้นหนา 10px
          p.beginShape();
          for (const [index, pos] of a.trail.entries()) {
            p.vertex(pos.x, pos.y);
          }
          p.endShape();
        }

        // ---------- วาด visibility ----------
        if (VISUAL_SETTING.visibility) {
          p.noFill();
          p.stroke(r, g, b, 50); // สีโปร่งแสง
          p.strokeWeight(5); // เส้นหนา 10px
          p.circle(a.x, a.y, a.visibility);
        }

        // ---------- วาดตัว citizen ----------

        // ถ้าเป็นตัวดึงดูดที่สุด + female + มีรูป → ไม่วาดวงกลมสีเลย
        const isSpecial =
          a.attractiveness === World.maxAttractiveness &&
          a.gender === "female" &&
          img &&
          img2;

        if (!isSpecial) {
          // วาดวงกลมปกติ
          if (a.isAlive) {
            p.fill(r, g, b);
          } else {
            p.fill(114, 114, 114);
          }

          p.noStroke();
          p.circle(a.x, a.y, a.size);
        }

        // ------ วาดภาพแทนวงกลม ------
        if (isSpecial) {
          /*   p.noStroke();
          p.noFill();
          if(a.reproductionCooldown > 0){
            p.image(img, a.x - a.size / 2, a.y - a.size / 2, a.size, a.size);
          }else{
            p.image(img2, a.x - a.size / 2, a.y - a.size / 2, a.size, a.size);
          } */
          p.fill(255, 141, 161);
          p.stroke(255, 125, 125);
          p.strokeWeight(5);
          p.circle(a.x, a.y, a.size);
        }

        // วาดวงกลมตัว citizen

        // ---------- วาด facing indicator ----------
        if (VISUAL_SETTING.facingSensor) {
          p.stroke(255, 255, 255, 200);
          p.strokeWeight(2);
        }

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
    /*     p.mousePressed = () => {
      const agentName = "B" + Math.floor(Math.random() * 1000);

      const newBusiness = createBusiness({ agentName: agentName });
      newBusiness.x = p.mouseX;
      newBusiness.y = p.mouseY;

      World.addAgent(newBusiness);

      console.log("New Business created:", agentName, "at", p.mouseX, p.mouseY);
    }; */

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
let draggedItem = null;
let offsetX = 0;
let offsetY = 0;
let zIndexCounter = 10;

let isResizing = false;
let resizeItem = null;
let startWidth = 0;
let startHeight = 0;
let startX = 0;
let startY = 0;

function initDraggableDialogs() {
  const dialogs = document.querySelectorAll(".dialog");

  dialogs.forEach((item) => {
    const content = item.querySelector(".content");
    const handle = item.querySelector(".resize-handle");

    // ---- Drag ----
    content.addEventListener("mousedown", (e) => {
      e.stopPropagation(); // prevent drag

      isDragging = true;
      draggedItem = item;
      offsetX = e.clientX - item.offsetLeft;
      offsetY = e.clientY - item.offsetTop;

      zIndexCounter++;
      item.style.zIndex = zIndexCounter;
      content.style.cursor = "grabbing";
    });

    // ---- Resize ----
    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation(); // prevent drag
      isResizing = true;
      resizeItem = item;
      startWidth = item.offsetWidth;
      startHeight = item.offsetHeight;
      startX = e.clientX;
      startY = e.clientY;

      zIndexCounter++;
      item.style.zIndex = zIndexCounter;
    });
  });

  window.addEventListener("mousemove", (e) => {
    // Drag
    if (isDragging && draggedItem) {
      draggedItem.style.left = `${e.clientX - offsetX}px`;
      draggedItem.style.top = `${e.clientY - offsetY}px`;
    }

    // Resize both width and height
    if (isResizing && resizeItem) {
      const newWidth = startWidth + (e.clientX - startX);
      const newHeight = startHeight + (e.clientY - startY);

      // min width/height 50px
      resizeItem.style.width = `${Math.max(newWidth, 50)}px`;
      resizeItem.style.height = `${Math.max(newHeight, 50)}px`;
    }
  });

  window.addEventListener("mouseup", () => {
    if (draggedItem)
      draggedItem.querySelector(".content").style.cursor = "grab";
    isDragging = false;
    draggedItem = null;

    isResizing = false;
    resizeItem = null;
  });
}

initDraggableDialogs();

let populationChart = null;

function renderPopulationChart(data) {
  const ctx = document.getElementById("populationChart").getContext("2d");

  // ถ้ามี chart เก่าอยู่ ให้ destroy
  if (populationChart) {
    populationChart.destroy();
  }

  const labels = data.map((d) => `${d.days}`);
  const aliveData = data.map((d) => d.alive);
  const deadData = data.map((d) => d.dead);
  const newBornsData = data.map((d) => d.newBorns);

  populationChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Alive",
          data: aliveData,
          backgroundColor: "rgba(54, 162, 235, 0.7)",
          borderColor: "rgba(54, 162, 235, 0.7)",
        },
        /*   {
          label: 'Dead',
          data: deadData,
          backgroundColor: 'rgba(255, 99, 132, 0.7)',
         borderColor:  'rgba(255, 99, 132, 0.7)',
        }, */
        {
          label: "newBorns",
          data: newBornsData,
          backgroundColor: "rgba(0, 99, 90, 0.7)",
          borderColor: "rgba(0, 99, 90, 0.7)",
        },
      ],
    },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        title: {
          display: true,
          text: "Population Over Days",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function updateStats() {
  const statsDivs = document.getElementById("stats");
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

  const newBorns = citizens.filter((c) => c.age <= 1).length;

  if ((World.tick % World.worldTicksPerDay) / 2 === 0) {
    Logs.addLog({
      tick: World.tick,
      days: Math.floor(World.tick / World.worldTicksPerDay),
      alive: totalAlive,
      dead: World.agentsDead.length,
      male: numMale,
      female: numFemale,
      totalEat,
      businesses: businesses.length,
      attractiveness: World.maxAttractiveness.toFixed(2),
      newBorns: newBorns,
    });
  }

  if (Logs.logs.length > 0 && (World.tick % World.worldTicksPerDay) / 2 === 0) {
    console.log(Logs.logs, "ddasdd");

    // Extract labels (days) และ dataset values
    const data = Logs.logs || [];
    renderPopulationChart(data); // initial
  }

  statsDivs.innerHTML = `
      <h2>World Stats</h2>
      <p>Days: ${Math.floor(World.tick / World.worldTicksPerDay)} (${
    World.tick
  })</p>
      <p>Alive: ${totalAlive}</p>
      <p>Dead: ${World.agentsDead.length}</p>
      <p>Male: ${numMale}</p>
      <p>Female: ${numFemale}</p>
      <p>Total Eat: ${totalEat}</p>
      <p>Total Businesses: ${businesses.length}</p>
      <p>Most attractiveness: ${World.maxAttractiveness.toFixed(2)}</p>
      <p>newBorns : ${newBorns}</p>
     

    `;
}
