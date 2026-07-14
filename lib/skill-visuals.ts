// Deterministic per-skill color for chips/progress bars in the redesigned UI.
// The Skill model has no color/icon field, so this is a presentation-only
// hash — not stored data, and not used by any gamification/business logic.
const SKILL_PALETTE = ["#2F6FED", "#7C5CFC", "#17B26A", "#FF8A3D", "#EF2D46", "#0EA5B0"]

export function skillColorFor(skillId: string | null): string {
  if (!skillId) return "#8A7B6C"
  let hash = 0
  for (let i = 0; i < skillId.length; i++) hash = (hash * 31 + skillId.charCodeAt(i)) | 0
  return SKILL_PALETTE[Math.abs(hash) % SKILL_PALETTE.length]
}
