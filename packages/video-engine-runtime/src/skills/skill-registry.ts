import { DirectorSkill } from "./base-skill";
import { MedicalDoctorAuthoritySkill } from "./medical-doctor-authority.skill";
import { ShortFormViralReelSkill } from "./short-form-viral-reel.skill";
import { SaaSTechDemoSkill } from "./saas-tech-demo.skill";

export class SkillRegistry {
  private static instance: SkillRegistry;
  private skills: Map<string, DirectorSkill> = new Map();

  private constructor() {
    this.register(new MedicalDoctorAuthoritySkill());
    this.register(new ShortFormViralReelSkill());
    this.register(new SaaSTechDemoSkill());
  }

  static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  register(skill: DirectorSkill): void {
    this.skills.set(skill.id, skill);
  }

  get(skillId: string): DirectorSkill | undefined {
    return this.skills.get(skillId);
  }

  getAll(): DirectorSkill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Automatically discovers and matches the best Director Skill based on prompt and transcript context
   */
  matchBestSkill(prompt: string, transcriptSummary?: string): DirectorSkill {
    let highestScore = -1;
    let bestSkill: DirectorSkill = this.skills.get("short-form-viral-reel") || this.getAll()[0];

    for (const skill of this.skills.values()) {
      const score = skill.matchScore(prompt, transcriptSummary);
      if (score > highestScore) {
        highestScore = score;
        bestSkill = skill;
      }
    }

    return bestSkill;
  }
}
