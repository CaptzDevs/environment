import { WORLD_CONFIG } from "../config/config";
import { randInt } from "../helper/math";
import { dropArea } from "../helper/movement";
import { createCitizen } from "../main";

export const Actions = {
  resource: {
    eat: (world, agent, ag, dist) => {
      if (ag.type === "business") {
        if (dist <= agent.size && !agent.hasEnteredBusiness) {
          agent.hasEnteredBusiness = true;
          agent.lastBusiness = ag.agentName;
          agent.hunger += 10;
          agent.size += 1;
          agent.visibility += 1;
          agent.eaten += 1;
          const index = world.agents.indexOf(ag);
          world.agents.splice(index, 1);
          console.log(`${agent.agentName} entered business ${ag.agentName}`);
        } else if (dist > agent.size) {
          agent.hasEnteredBusiness = false;
        }
      }
    },
    giveFoodToBaby: (world, agent, ag, dist) => {
      if (
        agent.type === "citizen" &&
        agent.age >= 5 &&
        agent.gender === "female" &&
        agent.eaten > 0 &&
        agent != ag &&
        ag.isAlive &&
        ag.age < 5 &&
        ag.type === "citizen"
      ) {
        if (dist <= agent.size) {
          agent.eaten -= 1;
          agent.hunger -= 10;
          agent.visibility -= 1;
          agent.size -= 1;

          ag.hunger += 10;
          ag.eaten += 1;
          ag.size += 1;
        }
      }
    },
    giveFoodToFemaleWithMostAttractive: (world, agent, ag, dist) => {
      if (
        agent.type === "citizen" &&
        agent.age >= 5 &&
        agent.gender === "male" &&
        agent != ag &&
        agent.eaten > 0 &&
        ag.isAlive &&
        ag.type === "citizen" &&
        ag.attractiveness >= world.maxAttractiveness
      ) {
        if (dist <= agent.size) {
          agent.eaten -= 1;
          agent.hunger -= 10;
          agent.visibility -= 1;
          agent.size -= 1;

          ag.hunger += 10;
          ag.eaten += 1;
          ag.size += 1;
        }
      }
    },

    breeding: (world, agent, ag, dist) => {
      if (
        agent.gender === "male" &&
        agent.type === "citizen" &&
        ag.gender === "female" &&
        ag.isAlive &&
        ag.age >= 3 &&
        ag.type === "citizen" &&
        ag.reproductionCooldown === 0 &&
        agent.matingDrive === 100 &&
        ag.reproductionCooldown === 0
      ) {
        if (dist <= ag.size) {
          const { x: clampedX, y: clampedY } = dropArea(ag);
          const breedingChance = Math.random();
          if (breedingChance > ag.reproductionChance) {
            for (let i = 0; i < randInt(1, 3); i++) {
              const newCitizen = world.addAgent(
                createCitizen({
                  x: clampedX,
                  y: clampedY,
                  size: 8,
                })
              );

              ag.children = [...ag.children, ...newCitizen];
            }
            ag.reproductionCooldown = 100;
            agent.matingDrive = 0;
          }
        }
      }
    },
  },
};
