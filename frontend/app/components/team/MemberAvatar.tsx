"use client";

import type { CSSProperties } from "react";
import { Avatar } from "@/app/components/ui/Avatar";
import { getStatusRingStyle, useUserStatus } from "@/app/hooks/useUserStatus";
import { useAuth } from "@/app/lib/auth";
import { normalizeName } from "@/app/lib/ticket-metrics";
import type { RosterMember } from "@/app/lib/types";

/** Whether this roster member is the person logged in: the same way the profile page finds them. */
export function useIsCurrentMember(member: Pick<RosterMember, "id" | "email" | "name"> | null | undefined): boolean {
  const { user } = useAuth();
  if (!user || !member) return false;
  if (member.id === user.id) return true;
  if (member.email && user.email && member.email.toLowerCase() === user.email.toLowerCase()) return true;
  const name = normalizeName(user.name);
  return Boolean(name) && normalizeName(member.name) === name;
}

const SIZES = {
  sm: { ring: "roster-avatar-ring-wrapper", dot: "roster-avatar-status-badge" },
  md: { ring: "roster-table-avatar-ring-wrapper", dot: "roster-table-status-badge" },
  lg: { ring: "drawer-avatar-ring-wrapper", dot: "drawer-avatar-status-badge" },
} as const;

/** A person on the Team Roster, with the ring and small dot in the colour of their status. For the person logged in that is the status they picked themselves. */
export function MemberAvatar({ member, size = "md" }: { member: Pick<RosterMember, "id" | "email" | "name" | "status">; size?: keyof typeof SIZES }) {
  const isMe = useIsCurrentMember(member);
  const { userStatus } = useUserStatus();
  return (
    <span data-member-ring className={`${SIZES[size].ring} shrink-0`} style={getStatusRingStyle(member.status, isMe, userStatus) as CSSProperties} title={`${member.name} (${isMe ? userStatus : member.status})`}>
      <Avatar size={size} name={member.name} />
      <span data-member-dot aria-hidden="true" className={SIZES[size].dot} />
    </span>
  );
}
