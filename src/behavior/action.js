import { WORLD_CONFIG } from "../config/config";
import { isCollide, isInside } from "../helper/distant";
import { randInt } from "../helper/math";
import { dropArea } from "../helper/movement";
import { createCitizen } from "../main";

export const Actions = {
  resource: {
    eat: (world, agent, ag, dist) => {
      if (ag.type === "business") {
        if ((isCollide(agent, ag) || isInside(agent, ag)) && !agent.hasEnteredBusiness) {
          agent.hasEnteredBusiness = true;
          agent.lastBusiness = ag.agentName;
          agent.hunger += 10;
          agent.size += 1;
          agent.visibility += 1;
          agent.eaten += 1;
          const index = world.agents.indexOf(ag);
          world.agents.splice(index, 1);
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
        agent.behaviors.giveFoodToBaby.cooldown === 0 &&
        ag.isAlive &&
        ag.age < 5 &&
        ag.type === "citizen"
      ) {
        if (isCollide(agent, ag)) {
          agent.eaten -= 1;
          agent.hunger -= 10;
          agent.visibility -= 1;
          agent.size -= 1;

          ag.hunger += 10;
          ag.eaten += 1;
          ag.size += 1;
          agent.behaviors.giveFoodToBaby.cooldown = 100;
        }
      }
    },
    giveFoodToFemaleWithMostAttractive: (world, agent, ag, dist) => {
      if (
        agent.type === "citizen" &&
        agent.age >= 5 &&
        agent.gender === "male" &&
        agent.behaviors.giveFoodToFemale.cooldown === 0 &&
        agent != ag &&
        agent.eaten > 0 &&
        ag.isAlive &&
        ag.type === "citizen" &&
        ag.attractiveness >= world.maxAttractiveness
      ) {
        if (isCollide(agent, ag)) {
          agent.eaten -= 5;
          agent.hunger -= 50;
          agent.size -= 5;
          agent.visibility -= 5;

          ag.eaten += 5;
          ag.hunger += 50;
          ag.size += 5;
          agent.behaviors.giveFoodToFemale.cooldown = 100;

        }
      }
    },
     giveFoodToFemale: (world, agent, ag, dist) => {
      if (
        agent.type === "citizen" &&
        agent.age >= 5 &&
        agent.gender === "male" &&
        agent != ag &&
        agent.eaten > 0 &&
        agent.behaviors.giveFoodToFemale.cooldown === 0 &&
        ag.isAlive &&
        ag.type === "citizen" 
      ) {
        if (isCollide(agent, ag)) {
          agent.eaten -= 5;
          agent.hunger -= 50;
          agent.size -= 5;
          agent.visibility -= 5;

          ag.eaten += 5;
          ag.hunger += 50;
          ag.size += 5;
          agent.behaviors.giveFoodToFemale.cooldown = 100;

        }
      }
    },
    attack: (world, agent, ag, dist) => {
      if (
        agent.type === "citizen" &&
        agent.age >= 5 &&
        agent.gender === "male" &&
        //agent.behaviors.matingDrive.cooldown === 0 &&
        ag.gender === "male" &&
        agent != ag &&
        ag.isAlive &&
        ag.age >= 5 &&
        ag.type === "citizen"
      ) {
        if (isCollide(agent, ag)) {
          if (agent.size > ag.size) {
            ag.getHit = true;
            agent.hunger += 20;
            ag.hunger -= 20;
          } else {
            ag.hunger += 20;
            agent.hunger -= 20;
          }
        }
      }
    },

    breeding: (world, agent, ag, dist) => {
      if (
        agent.gender === "male" &&
        agent.type === "citizen" &&
        agent.behaviors.matingDrive.cooldown === 0 &&
        ag.gender === "female" &&
        ag.isAlive &&
        ag.age >= 3 &&
        ag.type === "citizen" &&
        ag.behaviors.reproduction.cooldown === 0 
      ) {
        if (isCollide(agent, ag)) {

          const { x: clampedX, y: clampedY } = dropArea(ag);
          const breedingChance = Math.random();
          if (breedingChance > ag.behaviors.reproduction.chance) {
            const totalChild = randInt(1, 5)
            for (let i = 0; i < totalChild; i++) {
              const newCitizen = world.addAgent(
                createCitizen({
                  x: clampedX,
                  y: clampedY,
                  size: 8,
                })
              );

              ag.children = [...ag.children, ...newCitizen];
            }
            ag.behaviors.reproduction.cooldown = 100;
            agent.behaviors.matingDrive.cooldown = 100;
            ag.eaten -= 5*totalChild;
            ag.size -=  5*totalChild;
            
          }
        }
      }
    },
  },
};
