"use client";

import { useSession } from "next-auth/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrgSwitcherProps {
  value?: string;
  onChange?: (value: string) => void;
}

export function OrgSwitcher({ value, onChange }: OrgSwitcherProps) {
  const { data: session } = useSession();
  const memberships = (session?.user as any)?.memberships || [];

  if (memberships.length <= 1) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        {memberships.map((m: any) => (
          <SelectItem key={m.organizationId} value={m.organizationId}>
            {m.organization.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
