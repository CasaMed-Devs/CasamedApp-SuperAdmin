import {
  BellRingIcon,
  CircleDotIcon,
  CrownIcon,
  PencilIcon,
  Trash2Icon,
  UserRoundXIcon,
  type LucideIcon,
} from "lucide-react";

export const AUDIT_ACTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "membership.grant", label: "Granted membership", icon: CrownIcon },
  { value: "membership.revoke", label: "Revoked membership", icon: UserRoundXIcon },
  { value: "patient.update", label: "Edited patient profile", icon: PencilIcon },
  { value: "user.update", label: "Edited user", icon: PencilIcon },
  { value: "user.purge", label: "Permanently deleted user", icon: Trash2Icon },
  { value: "push.send", label: "Sent push notification", icon: BellRingIcon },
];

export function auditMeta(action: string): { label: string; icon: LucideIcon } {
  const found = AUDIT_ACTIONS.find((a) => a.value === action);
  return found ?? { label: action, icon: CircleDotIcon };
}
