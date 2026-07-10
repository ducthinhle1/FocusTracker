import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface SkillOption {
  id: string
  name: string
}

interface SkillPickerProps {
  skills: SkillOption[]
  onSelect: (skillId: string | null) => void
}

export function SkillPicker({ skills, onSelect }: SkillPickerProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>What are you focusing on?</CardTitle>
        <CardDescription>
          Tag this session to a skill to track progress, or skip.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t added any skills yet.{" "}
            <Link href="/skills" className="underline underline-offset-4">
              Add one
            </Link>{" "}
            to start tracking progress per skill.
          </p>
        ) : (
          skills.map((skill) => (
            <Button
              key={skill.id}
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => onSelect(skill.id)}
            >
              {skill.name}
            </Button>
          ))
        )}
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => onSelect(null)}
        >
          Skip / General Focus
        </Button>
      </CardFooter>
    </Card>
  )
}
