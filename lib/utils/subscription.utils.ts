"server only";

import { clerkClient, auth } from "@clerk/nextjs/server";
import { PLAN_LIMITS, PlanType } from "../subscriptions-constants";

const toPlanTypeFromSlug = (slugLike: unknown): PlanType | null => {
  const slug = String(slugLike || "").toLowerCase();
  if (!slug) return null;
  if (/pro/i.test(slug)) return "pro";
  if (/standard/i.test(slug)) return "standard";
  return null;
};

export const getUserPlan = async (
  userIdHint?: string,
  orgIdHint?: string | null,
): Promise<PlanType> => {
  const { userId: authedUserId, orgId: authedOrgId } = await auth();
  const userId = userIdHint || authedUserId;
  const orgId = orgIdHint ?? authedOrgId ?? null;

  if (!userId) {
    return "free";
  }

  try {
    const client = await clerkClient();

    // Preferred: ask Clerk Billing for the active subscription created by <PricingTable />.
    // This avoids relying on metadata you may not be writing anywhere yet.
    try {
      const billing = (client as any).billing;
      // If the app uses organization subscriptions, prefer that when an org is active.
      if (orgId && billing?.getOrganizationBillingSubscription) {
        const sub = await billing.getOrganizationBillingSubscription(orgId);
        const status = String(sub?.status || "").toLowerCase();
        const isActive = status === "active" || status === "trialing";

        const planFromBilling =
          toPlanTypeFromSlug(sub?.plan?.slug) ||
          toPlanTypeFromSlug(sub?.planSlug) ||
          toPlanTypeFromSlug(sub?.plan?.name);

        console.log("[getUserPlan] org billing subscription:", {
          orgId,
          status,
          plan: planFromBilling,
        });

        if (isActive && planFromBilling) {
          return planFromBilling;
        }
      }

      if (billing?.getUserBillingSubscription) {
        const sub = await billing.getUserBillingSubscription(userId);
        const status = String(sub?.status || "").toLowerCase();
        const isActive = status === "active" || status === "trialing";

        const planFromBilling =
          toPlanTypeFromSlug(sub?.plan?.slug) ||
          toPlanTypeFromSlug(sub?.planSlug) ||
          toPlanTypeFromSlug(sub?.plan?.name);

        console.log("[getUserPlan] user billing subscription:", {
          status,
          plan: planFromBilling,
        });

        if (isActive && planFromBilling) {
          return planFromBilling;
        }
      }
    } catch (error) {
      console.warn("[getUserPlan] billing lookup failed; falling back", error);
    }

    const user = await client.users.getUser(userId);

    // for debugging: log the raw metadata so we can see what Clerk is
    // actually returning. mismatched slugs are a common source of bugs.
    console.log("[getUserPlan] publicMetadata", user.publicMetadata);
    console.log("[getUserPlan] privateMetadata", user.privateMetadata);

    // sometimes we store a simple `plan` field on the user; check it first
    const planFromMeta =
      (user.publicMetadata?.plan as string) ||
      (user.privateMetadata?.plan as string);
    if (planFromMeta === "pro" || planFromMeta === "standard") {
      return planFromMeta as PlanType;
    }

    // Check if user has active subscriptions
    // Clerk stores subscription info in user metadata or through webhooks
    // This is a simplified check - adjust based on your webhook implementation
    const subscriptions =
      ((user.publicMetadata?.subscriptions ||
        user.privateMetadata?.subscriptions) as any[]) || [];

    // Helper that tests slug/plan text in a more lenient way in case the
    // values don't exactly match our constants (e.g. "standard_monthly").
    const slugMatches = (sub: any, pattern: RegExp) => {
      const slug = String(sub.planSlug || sub.plan || "");
      return pattern.test(slug);
    };

    // Check for pro plan first (highest priority)
    const hasPro = subscriptions.some(
      (sub: any) => sub.status === "active" && slugMatches(sub, /pro/i),
    );
    if (hasPro) {
      return "pro";
    }

    // Check for standard plan
    const hasStandard = subscriptions.some(
      (sub: any) => sub.status === "active" && slugMatches(sub, /standard/i),
    );
    if (hasStandard) {
      return "standard";
    }

    // Default to free
    return "free";
  } catch (error) {
    console.error("Error checking user plan:", error);
    return "free";
  }
};

export const getUserLimits = async (
  userIdHint?: string,
  orgIdHint?: string | null,
): Promise<
  (typeof PLAN_LIMITS)[PlanType] & { plan: PlanType }
> => {
  const plan = await getUserPlan(userIdHint, orgIdHint);
  return { ...PLAN_LIMITS[plan], plan };
};

// Client-side utility (for future use)
export const useUserPlan = () => {
  // This would be used in client components with Clerk's useAuth
  // For now, we'll implement server-side checks
};
